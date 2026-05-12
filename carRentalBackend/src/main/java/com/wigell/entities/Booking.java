package com.wigell.entities;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "Booking")
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "from_date", nullable = false)
    private LocalDate fromDate;

    @Column(name = "to_date", nullable = false)
    private LocalDate toDate;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "car_id", nullable = false)
    private Long carId;

    @Column(name = "active", nullable = false)
    private boolean active;

    // Tom konstruktor (krävs av JPA)
    public Booking() {
    }

    // Konstruktor med alla fält (förutom id, som genereras automatiskt)
    public Booking(LocalDate fromDate, LocalDate toDate, Long userId, Long carId, boolean active) {
        this.fromDate = fromDate;
        this.toDate = toDate;
        this.userId = userId;
        this.carId = carId;
        this.active = active;
    }
    // Konstruktor med alla fält (förutom id och active, som genereras automatiskt)
    public Booking(LocalDate fromDate, LocalDate toDate, Long userId, Long carId) {
        this.fromDate = fromDate;
        this.toDate = toDate;
        this.userId = userId;
        this.carId = carId;
        this.active = true;
    }

    // Getters och Setters

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public LocalDate getFromDate() {
        return fromDate;
    }

    public void setFromDate(LocalDate fromDate) {
        this.fromDate = fromDate;
    }

    public LocalDate getToDate() {
        return toDate;
    }

    public void setToDate(LocalDate toDate) {
        this.toDate = toDate;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Long getCarId() {
        return carId;
    }

    public void setCarId(Long carId) {
        this.carId = carId;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }
}
