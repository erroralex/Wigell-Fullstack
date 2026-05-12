package com.wigell.dto;

import java.time.LocalDate;

public class BookingDTO {
    private long id;
    private LocalDate fromDate;
    private LocalDate toDate;
    private long carId;
    private boolean active;

    public BookingDTO() {
    }

    public BookingDTO(long id, LocalDate fromDate, LocalDate toDate, long carId, boolean active) {
        this.id = id;
        this.fromDate = fromDate;
        this.toDate = toDate;
        this.carId = carId;
        this.active = active;
    }

    public long getId() {
        return id;
    }

    public void setId(long id) {
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

    public long getCarId() {
        return carId;
    }

    public void setCarId(long carId) {
        this.carId = carId;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }
}
