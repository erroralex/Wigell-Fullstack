package com.wigell.dao;

import com.wigell.entities.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BookingRepo extends JpaRepository<Booking, Long> {

    // Hämtar alla bokningar för en specifik kund
    List<Booking> findAllByUserId(Long id);

    // Hämtar bokningar baserat på aktiv status
    List<Booking> findByActive(boolean active);


}
