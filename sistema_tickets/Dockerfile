FROM eclipse-temurin:21-jdk

WORKDIR /app

COPY pom.xml ./
COPY src ./src

RUN apt-get update && apt-get install -y maven && mvn -q -DskipTests package

EXPOSE 3000

CMD ["java", "-jar", "target/sistema-tickets-1.0.0.jar"]