package com.wigell.services;

import com.wigell.dao.BookingRepo;
import com.wigell.dao.UserRepo;
import com.wigell.dto.BookingDTO;
import com.wigell.entities.Booking;
import com.wigell.entities.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
public class UserService {

    private final UserRepo userRepo;
    private final BookingRepo bookingRepo;
    private final PasswordEncoder passwordEncoder;

    @Autowired
    public UserService(UserRepo userRepo, BookingRepo bookingRepo, PasswordEncoder passwordEncoder) {
        this.userRepo = userRepo;
        this.bookingRepo = bookingRepo;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Hämtar alla användare.
     *
     * @return lista med alla användare.
     */
    public List<User> users() {
        return userRepo.findAll();
    }

    /**
     * Hämtar den aktuella användaren baserat på användarnamn.
     *
     * @param username användarnamnet som ska sökas.
     * @return User-objekt om hittad, annars null.
     */
    public User findCurrentUser(String username) {
        return userRepo.findByUsername(username)
                .orElse(null);
    }

    /**
     * Hämtar alla bokningar som BookingDTO-objekt.
     *
     * @return lista med bokningar.
     */
    public List<BookingDTO> getOrders() {
        List<Booking> orders = bookingRepo.findAll();
        List<BookingDTO> bookingDTOList = new ArrayList<>();
        for (Booking b : orders) {
            bookingDTOList.add(new BookingDTO(
                    b.getId(),
                    b.getFromDate(),
                    b.getToDate(),
                    b.getCarId(),
                    b.isActive()
            ));
        }
        return bookingDTOList;
    }

    /**
     * Uppdaterar en befintlig användare med nya uppgifter.
     * Vid uppdatering kommer det befintliga värdet för noOfOrders att bevaras.
     *
     * Om ett nytt lösenord skickas med antas det vara i klartext och krypteras.
     *
     * @param tempUser de uppdaterade uppgifterna för användaren.
     * @return ResponseEntity med uppdaterad användare eller 404 om användaren inte hittas.
     */
    public ResponseEntity<User> updateUser(User tempUser) {
        Optional<User> optionalUser = userRepo.findById(tempUser.getId());
        if (optionalUser.isPresent()) {
            User user = optionalUser.get();
            user.setFirstName(tempUser.getFirstName());
            user.setLastName(tempUser.getLastName());
            user.setUsername(tempUser.getUsername());
            user.setPhone(tempUser.getPhone());
            user.setEmail(tempUser.getEmail());
            // Om lösenordet ändras, kryptera det nya lösenordet.
            if (tempUser.getPassword() != null && !tempUser.getPassword().isEmpty()) {
                String encodedPassword = passwordEncoder.encode(tempUser.getPassword());
                user.setPassword(encodedPassword);
            }
            // noOfOrders bevaras från befintlig användare
            final User updatedUser = userRepo.save(user);
            return ResponseEntity.ok(updatedUser);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Lägger till en ny användare.
     * Lösenordet krypteras innan användaren sparas.
     *
     * @param user det nya användarobjektet.
     * @return det sparade användarobjektet.
     */
    public User addUser(User user) {
        user.setNoOfOrders(0);
        // Om ingen roll anges, tilldela standardrollen ROLE_USER
        if (user.getRole() == null || user.getRole().trim().isEmpty()) {
            user.setRole("ROLE_USER");
        }
        if (Objects.equals(user.getRole(), "admin") || user.getRole().trim().isEmpty()) {
            user.setRole("ROLE_ADMIN");
        }
        String encodedPassword = passwordEncoder.encode(user.getPassword());
        user.setPassword(encodedPassword);
        return userRepo.save(user);
    }


    /**
     * Tar bort en användare baserat på id.
     *
     * @param id användarens id.
     */
    public void deleteUserById(Long id) {
        userRepo.deleteById(id);
    }

    /**
     * Hämtar en specifik användare baserat på id.
     *
     * @param id användarens id.
     * @return Optional med användaren om den hittas.
     */
    public Optional<User> getUser(Long id) {
        return userRepo.findById(id);
    }



    /**
     * Hämtar alla bokningar för en specifik användare.
     *
     */
    @Transactional(readOnly = true)
    public List<BookingDTO> getOrdersForUser(Long userId) {
        return bookingRepo.findAllByUserId(userId).stream()
                .map(b -> new BookingDTO(
                        b.getId(),
                        b.getFromDate(),
                        b.getToDate(),
                        b.getCarId(),
                        b.isActive()
                ))
                .toList();
    }
}
