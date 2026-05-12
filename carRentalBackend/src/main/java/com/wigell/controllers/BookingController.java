package com.wigell.controllers;

import com.wigell.entities.Booking;
import com.wigell.entities.User;
import com.wigell.services.BookingService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;


@RestController
@RequestMapping("/api/v1/bookings")
@CrossOrigin(origins = "http://127.0.0.1:5500", allowCredentials = "true")
public class BookingController {

    private static final Logger logger = LoggerFactory.getLogger(BookingController.class);
    private final BookingService bookingService;

    public BookingController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    /**
     * Hämtar alla bokningar.
     *
     * @return ResponseEntity med lista över alla bokningar och HTTP-status OK.
     */
    //Testad
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @GetMapping
    public ResponseEntity<List<Booking>> getAllBookings() {
        List<Booking> bookings = bookingService.getAllBookings();
        return ResponseEntity.ok(bookings);
    }

    /**
     * Hämtar alla bokningar för en specifik användare (userId).
     * Endast en admin får komma åt denna.
     */
    //Testad
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Booking>> getBookingsForUser(@PathVariable Long userId) {
        List<Booking> bookings = bookingService.getMyOrders(userId);
        if (bookings.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        return ResponseEntity.ok(bookings);
    }

    /**
     * Hämtar alla bokningar för den inloggade användaren.
     * Ingen path-variabel behövs, servern tar userId ur principal.
     * Returnerar 404 om ingen bokning hittas.
     */
    //Testad
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/me")
    public ResponseEntity<List<Booking>> getMyBookings(
            @AuthenticationPrincipal User currentUser) {

        Long userId = currentUser.getId();
        List<Booking> bookings = bookingService.getMyOrders(userId);

        if (bookings.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        return ResponseEntity.ok(bookings);
    }
    /**
     * Hämtar alla aktiva bokningar.
     *
     * @return ResponseEntity med lista över aktiva bokningar och HTTP-status OK.
     */
    //Testad
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @GetMapping("/active")
    public ResponseEntity<List<Booking>> getActiveBookings() {
        List<Booking> activeBookings = bookingService.getActiveBookings();
        return ResponseEntity.ok(activeBookings);
    }

    /**
     * Hämtar en enskild bokning med angivet ID.
     * Kontroll sker om username och password matchar userId i bokningen.
     */
    @PreAuthorize(
            "@bookingService.getBookingById(#id).orElse(null)?.userId == principal.id"
                    + " or hasRole('ROLE_ADMIN')"
    )
    @GetMapping("/{id}")
    //Testad
    public ResponseEntity<Booking> getBookingById(@PathVariable Long id) {
        return bookingService.getBookingById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    /**
     * Skapar en ny bokning (order av bil).
     *
     * @param bookingRequest Bokningsobjektet som ska sparas.
     * @return ResponseEntity med HTTP-status 201 CREATED vid lyckad bokning,
     * Status 404 om bilens id inte hittas
     * annars INTERNAL_SERVER_ERROR vid fel.
     */
    //Testad
    @PostMapping
    public ResponseEntity<?> orderCar(
            @AuthenticationPrincipal User currentUser,
            @RequestBody Booking bookingRequest) {

        bookingRequest.setUserId(currentUser.getId());

        try {
            bookingService.orderCar(bookingRequest);
            return ResponseEntity.status(HttpStatus.CREATED).build();
        } catch (IllegalArgumentException e) {
            String msg = e.getMessage();
            HttpStatus status = msg.contains("not found")
                    ? HttpStatus.NOT_FOUND
                    : HttpStatus.BAD_REQUEST;
            return ResponseEntity.status(status)
                    .body(Map.of("error", msg));
        } catch (Exception e) {
            logger.error("Fel vid skapande av bokning: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Ett internt fel uppstod"));
        }
    }


    /**
     * Uppdaterar en existerande bokning.
     *
     * @param id             Id för bokningen som ska uppdateras.
     * @param bookingDetails De nya uppgifterna för bokningen.
     * @return ResponseEntity med den uppdaterade bokningen och HTTP-status OK,
     *         eller 404 NOT_FOUND om bokningen inte kunde hittas.
     */
    //Testad
    @PutMapping("/{id}")
    public ResponseEntity<Booking> updateOrder(@PathVariable long id, @RequestBody Booking bookingDetails) {
        try {
            Booking updatedBooking = bookingService.updateOrder(id, bookingDetails);
            if (updatedBooking != null) {
                return new ResponseEntity<>(updatedBooking, HttpStatus.OK);
            } else {
                return new ResponseEntity<>(HttpStatus.NOT_FOUND);
            }
        } catch (Exception e) {
            logger.error("Fel vid uppdatering av bokning med id {}: {}", id, e.getMessage(), e);
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    /**
     * Kunden returnerar en bokning.
     *
     * @param id Id för bokningen som ska returneras.
     * @return ResponseEntity med den returnerade bokningen och HTTP-status OK,
     *         eller 404 NOT_FOUND om bokningen inte kunde hittas.
     */
    //Testad
    @PutMapping("/return/{id}")
    public ResponseEntity<Booking> returnCar(@PathVariable long id) {
        try {
            Booking returnedBooking = bookingService.returnCar(id);
            if (returnedBooking != null) {
                return new ResponseEntity<>(returnedBooking, HttpStatus.OK);
            } else {
                return new ResponseEntity<>(HttpStatus.NOT_FOUND);
            }
        } catch (Exception e) {
            logger.error("Fel vid uppdatering av bokning med id {}: {}", id, e.getMessage(), e);
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    /**
     * Tar bort en bokning baserat på id.
     *
     * @param id Id för bokningen som ska tas bort.
     * @return ResponseEntity med HTTP-status NO_CONTENT vid lyckad borttagning,
     *         annars INTERNAL_SERVER_ERROR vid fel.
     */
    //Testad
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBooking(@PathVariable Long id) {
        try {
            bookingService.deleteBookingById(id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            logger.error("Fel vid borttagning av bokning med id {}: {}", id, e.getMessage(), e);
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
