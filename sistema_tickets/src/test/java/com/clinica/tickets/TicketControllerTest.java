package com.clinica.tickets;

import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;
import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TicketControllerTest {

    @Test
    void shouldExposeTicketEndpoints() {
        Method[] methods = TicketsApplication.class.getDeclaredMethods();
        assertTrue(Arrays.stream(methods).anyMatch(method -> method.getName().equals("getAllTickets")));
        assertTrue(Arrays.stream(methods).anyMatch(method -> method.getName().equals("createTicket")));
        assertTrue(Arrays.stream(methods).anyMatch(method -> method.getName().equals("callTicket")));
        assertTrue(Arrays.stream(methods).anyMatch(method -> method.getName().equals("deleteTicket")));
    }

    @Test
    void shouldExposeCacheInvalidationSupport() {
        assertDoesNotThrow(() -> TicketsApplication.class.getDeclaredMethod("invalidateTicketsCache"));
    }
}
