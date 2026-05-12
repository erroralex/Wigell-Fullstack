package com.wigell.controllers;

import com.wigell.dto.BookingDTO;
import com.wigell.entities.Booking;
import com.wigell.entities.User;
import com.wigell.services.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/users")
@CrossOrigin(origins = {"http://127.0.0.1:5500"}, allowCredentials = "true")
@EnableMethodSecurity
public class UserController {

    private final UserService userService;

    @Autowired
    public UserController(UserService userService) {
        this.userService = userService;
    }

    /**
     * Hämtar alla användare.
     */
    //Testad
    @GetMapping
    public ResponseEntity<List<User>> getAllUsers() {
        List<User> users = userService.users();
        return ResponseEntity.ok(users);
    }



/*    *//**
     * Endast admin kan hämta bokningar för en godtycklig userId.
     *//*
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @GetMapping("/{userId}/orders")
    public ResponseEntity<List<BookingDTO>> getOrdersForUser(
            @PathVariable Long userId) {

        List<BookingDTO> bookings = userService.getOrdersForUser(userId);
        if (bookings.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        return ResponseEntity.ok(bookings);
    }*/

    /**
     * Hämtar en specifik användare baserat på id.
     * Användare kan endast hämta sina egna data, annars returneras 403 Forbidden.
     * Admin kan hämta valfri användare.
     *
     * Om användaren inte hittas returneras 404 Not Found.
     */
    //Testad
    @PreAuthorize("#id == principal.id or hasRole('ROLE_ADMIN')")
    @GetMapping("/{id}")
    public ResponseEntity<User> getUser(@PathVariable Long id) {
        Optional<User> userOptional = userService.getUser(id);
        return userOptional
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    /**
     * Uppdaterar en befintlig användare.
     * Observera att fälten id och noOfOrders inte bör ändras manuellt från klienten.
     *
     * @param id   Användarens id.
     * @param user De nya uppgifterna för användaren.
     * @return Uppdaterad användare eller 404 Not Found om användaren inte finns.
     */
    //Testad
    @PreAuthorize("#id == principal.id or hasRole('ROLE_ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<User> updateUser(@PathVariable Long id, @RequestBody User user) {
        user.setId(id);
        // Hämta befintlig användare för att bevara t.ex. noOfOrders
        Optional<User> existingUserOpt = userService.getUser(id);
        if (existingUserOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        user.setNoOfOrders(existingUserOpt.get().getNoOfOrders());
        User updatedUser = userService.updateUser(user).getBody();
        if (updatedUser == null) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
        return ResponseEntity.ok(updatedUser);
    }


    /**
     * Skapar en ny användare.
     */
    //Testad
    @PostMapping
    public ResponseEntity<User> addUser(@RequestBody User user) {
        User newUser = userService.addUser(user);
        return ResponseEntity.status(HttpStatus.CREATED).body(newUser);
    }

    /**
     * Tar bort en användare baserat på id.
     */
    //Testad
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        userService.deleteUserById(id);
        return ResponseEntity.noContent().build();
    }
}
