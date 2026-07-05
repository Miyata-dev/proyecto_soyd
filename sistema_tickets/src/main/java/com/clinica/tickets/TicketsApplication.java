package com.clinica.tickets;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@SpringBootApplication
@RestController
public class TicketsApplication {

    private static final String TICKETS_CACHE_KEY = "tickets:all";
    private final JdbcTemplate jdbcTemplate;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    public TicketsApplication(JdbcTemplate jdbcTemplate, StringRedisTemplate redisTemplate) {
        this.jdbcTemplate = jdbcTemplate;
        this.redisTemplate = redisTemplate;
    }

    @GetMapping("/api/tickets")
    public List<Map<String, Object>> getAllTickets() {
        String cached = redisTemplate.opsForValue().get(TICKETS_CACHE_KEY);
        if (cached != null) {
            try {
                return objectMapper.readValue(cached, new TypeReference<List<Map<String, Object>>>() {});
            } catch (Exception e) {
                // Si el JSON en caché no se puede leer, seguimos y recalculamos desde la BD.
            }
        }

        List<Map<String, Object>> tickets = jdbcTemplate.queryForList(
                "SELECT id, paciente_id, area_id, numero_atencion, estado, fecha_creacion, fecha_llamado FROM tickets ORDER BY fecha_creacion DESC"
        );
        try {
            redisTemplate.opsForValue().set(TICKETS_CACHE_KEY, objectMapper.writeValueAsString(tickets), Duration.ofMinutes(5));
        } catch (Exception e) {
            // Si falla la serialización, simplemente no cacheamos esta vez.
        }
        return tickets;
    }

    @PostMapping("/api/tickets")
    public ResponseEntity<?> createTicket(@RequestBody Map<String, Object> body) {
        String id = UUID.randomUUID().toString();
        String pacienteId = String.valueOf(body.get("paciente_id"));
        Integer areaId = Integer.valueOf(String.valueOf(body.get("area_id")));
        String numeroAtencion = String.valueOf(body.get("numero_atencion"));

        jdbcTemplate.update(
                "INSERT INTO tickets (id, paciente_id, area_id, numero_atencion, estado) VALUES (?, ?, ?, ?, ?)",
                id, pacienteId, areaId, numeroAtencion, "EN_ESPERA"
        );
        invalidateTicketsCache();

        Map<String, Object> created = new LinkedHashMap<>();
        created.put("id", id);
        created.put("paciente_id", pacienteId);
        created.put("area_id", areaId);
        created.put("numero_atencion", numeroAtencion);
        created.put("estado", "EN_ESPERA");
        created.put("fecha_creacion", LocalDateTime.now());
        created.put("fecha_llamado", null);

        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PatchMapping("/api/tickets/{id}/llamar")
    public ResponseEntity<?> callTicket(@PathVariable String id) {
        int updated = jdbcTemplate.update(
                "UPDATE tickets SET estado = 'LLAMADO', fecha_llamado = CURRENT_TIMESTAMP WHERE id = ?",
                id
        );

        if (updated == 0) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Ticket no encontrado"));
        }

        invalidateTicketsCache();

        Map<String, Object> updatedTicket = jdbcTemplate.queryForMap(
                "SELECT id, paciente_id, area_id, numero_atencion, estado, fecha_creacion, fecha_llamado FROM tickets WHERE id = ?",
                id
        );
        return ResponseEntity.ok(updatedTicket);
    }

    @PatchMapping("/api/tickets/{id}/atender")
    public ResponseEntity<?> attendTicket(@PathVariable String id) {
        int updated = jdbcTemplate.update(
                "UPDATE tickets SET estado = 'ATENDIDO' WHERE id = ?",
                id
        );

        if (updated == 0) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Ticket no encontrado"));
        }

        invalidateTicketsCache();

        Map<String, Object> updatedTicket = jdbcTemplate.queryForMap(
                "SELECT id, paciente_id, area_id, numero_atencion, estado, fecha_creacion, fecha_llamado FROM tickets WHERE id = ?",
                id
        );
        return ResponseEntity.ok(updatedTicket);
    }

    @DeleteMapping("/api/tickets/{id}")
    public ResponseEntity<?> deleteTicket(@PathVariable String id) {
        int deleted = jdbcTemplate.update("DELETE FROM tickets WHERE id = ?", id);
        if (deleted == 0) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Ticket no encontrado"));
        }
        invalidateTicketsCache();
        return ResponseEntity.ok(Map.of("message", "Ticket eliminado correctamente"));
    }

    public void invalidateTicketsCache() {
        redisTemplate.delete(TICKETS_CACHE_KEY);
    }

    public static void main(String[] args) {
        SpringApplication.run(TicketsApplication.class, args);
    }
}