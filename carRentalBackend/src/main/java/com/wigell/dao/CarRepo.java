package com.wigell.dao;

import com.wigell.entities.Car;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface CarRepo extends JpaRepository<Car, Long> {


    // Om "name" antas vara unikt:
    Optional<Car> findByName(String name);

    // Om "model" antas vara unikt:
    Optional<Car> findByModel(String model);

    // Om det kan finnas flera bilar med samma pris:
    List<Car> findByPrice(BigDecimal price);
}
