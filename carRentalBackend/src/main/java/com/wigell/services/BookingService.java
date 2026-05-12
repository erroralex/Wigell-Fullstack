package com.wigell.services;

import com.wigell.dao.BookingRepo;
import com.wigell.dao.CarRepo;
import com.wigell.dao.UserRepo;
import com.wigell.entities.Booking;
import com.wigell.entities.Car;
import com.wigell.entities.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

@Service
public class BookingService {

    private static final Logger logger = LoggerFactory.getLogger(BookingService.class);

    private final BookingRepo bookingRepo;
    private final UserRepo userRepo;
    private final CarRepo carRepo;

    public BookingService(BookingRepo bookingRepo, UserRepo userRepo, CarRepo carRepo) {
        this.bookingRepo = bookingRepo;
        this.userRepo = userRepo;
        this.carRepo = carRepo;
    }

    /**
     * Hämtar alla bokningar.
     *
     * @return Lista över alla bokningar.
     */
    public List<Booking> myOrders() {
        return bookingRepo.findAll();
    }

    /**
     * Skapar en ny bokning (order av bil).
     * Kontrollerar att både kund och bil finns innan en ny bokning görs.
     *
     * @param booking Bokningsobjekt med nödvändig information.
     * @return Det sparade bokningsobjektet.
     * @throws IllegalArgumentException om kund eller bil inte hittas.
     */
    @Transactional
    public Booking orderCar(Booking booking) {
      /*  Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        System.out.println("Auth principal: " + auth.getName() + " authorities:" + auth.getAuthorities());
*/
        // Använder direkt Optional-varianten om findById returnerar Optional
        Optional<User> optionalUser = userRepo.findById(booking.getUserId());
        Optional<Car> optionalCar = carRepo.findById(booking.getCarId());

        if (optionalUser.isEmpty()) {
            logger.error("User not found: id={}", booking.getUserId());
            throw new IllegalArgumentException("User " + booking.getUserId() + " not found");
        }
        if (optionalCar.isEmpty()) {
            logger.error("Car not found: id={}", booking.getCarId());
            throw new IllegalArgumentException("Car " +  booking.getCarId() + " not found");
        }

        User user = optionalUser.get();
        Car car = optionalCar.get();

        // Uppdatera kund och bil baserat på bokningen
        user.setNoOfOrders(user.getNoOfOrders() + 1);
        car.setBooked(true);

        // Skapa ny bokning
        Booking newBooking = new Booking(booking.getFromDate(), booking.getToDate(),
                booking.getUserId(), booking.getCarId(), true);

        userRepo.save(user);
        carRepo.save(car);
        bookingRepo.save(newBooking);

        logger.info("New booking created: id={}", newBooking.getId());
        return newBooking;
    }

    /**
     * Uppdaterar en befintlig bokning med de nya uppgifterna.
     *
     * @param id             ID för den bokning som ska uppdateras.
     * @param bookingDetails Innehåller de fält som ska uppdateras.
     * @return Den uppdaterade bokningen eller null om bokningen inte hittas.
     */
    @Transactional
    public Booking updateOrder(long id, Booking bookingDetails) {
        Optional<Booking> optionalBooking = bookingRepo.findById(id);

        if (optionalBooking.isPresent()) {
            Booking existingBooking = optionalBooking.get();

            // Uppdatera endast de fält som skickas med (kontrollera eventuella null-värden)
            if (bookingDetails.getFromDate() != null) {
                existingBooking.setFromDate(bookingDetails.getFromDate());
            }
            if (bookingDetails.getToDate() != null) {
                existingBooking.setToDate(bookingDetails.getToDate());
            }
            if (bookingDetails.getUserId() != null && bookingDetails.getUserId() != 0) {
                existingBooking.setUserId(bookingDetails.getUserId());
            }
            if (bookingDetails.getCarId() != null && bookingDetails.getCarId() != 0) {
                existingBooking.setCarId(bookingDetails.getCarId());
            }
            // Uppdatera active-flaggans värde (boolean)
            existingBooking.setActive(bookingDetails.isActive());

            Booking updatedBooking = bookingRepo.save(existingBooking);
            logger.info("Booking updated: id={}", updatedBooking.getId());
            return updatedBooking;
        } else {
            logger.warn("Booking not found: id={}", Optional.of(id));
            return null;
        }
    }
    /**
     * När kund returnerar en bil sätter vi bokningens isActive till false.
     * Vi sätter även active-flaggen i car-entiteten till false.
     *
     * @param bookingId             ID för den bokning som ska uppdateras.
     * @return Den uppdaterade bokningen eller null om bokningen inte hittas.
     */
    @Transactional
    public Booking returnCar(long bookingId) {
        Booking booking = bookingRepo.findById(bookingId)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Booking med id " + bookingId + " finns inte"));

        // Sätt active-flaggan till false
        booking.setActive(false);

        // Frisläpp bilen
        Car car = carRepo.findById(booking.getCarId())
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Car med id " + booking.getCarId() + " finns inte"));
        car.setBooked(false);
        carRepo.save(car);

        // Spara och returnera
        Booking updated = bookingRepo.save(booking);
        logger.info("Returnerade bil för booking id={}. active=false satt.", bookingId);
        return updated;
    }


    /**
     * Tar bort en bokning baserat på id.
     *
     * @param id ID för bokningen som ska tas bort.
     */
    @Transactional
    public void deleteBookingById(Long id) {
        Optional<Booking> bookingOpt = bookingRepo.findById(id);
        if (bookingOpt.isEmpty()) {
            logger.warn("Attempt to delete non-existing booking: id={}", id);
            return;
        }

        Booking booking = bookingOpt.get();
        long userId = booking.getUserId();

        Optional<User> optionalUser = userRepo.findById(userId);
        if (optionalUser.isPresent()) {
            User user = optionalUser.get();
            int current = user.getNoOfOrders();
            user.setNoOfOrders(Math.max(0, current - 1));
            userRepo.save(user);
            logger.info("Decremented noOfOrders for user id={}: {} → {}",
                    userId, current, user.getNoOfOrders());
        } else {
            logger.warn("User not found when deleting booking id={}: userId={}",
                    id, userId);
        }

        bookingRepo.deleteById(id);
        logger.info("Booking deleted: id={}", id);
    }



    /**
     * Hämtar alla bokningar.
     *
     * @return Lista över alla bokningar.
     */
    public List<Booking> getAllBookings() {
        return bookingRepo.findAll();
    }

    /**
     * Hämtar en bokning baserat på dess ID.
     *
     * @param id ID för bokningen som ska hämtas.
     * @return Optional som innehåller bokningen om den hittas.
     */
    public Optional<Booking> getBookingById(Long id) {
        return bookingRepo.findById(id);
    }

    public List<Booking> getActiveBookings() {
        return bookingRepo.findByActive(true);
    }

    /**
     * Hämtar alla bokningar för en viss användare.
     *
     * @param userId det id som kopplas till bokningarna
     * @return lista med bokningar för den angivna användaren
     * @throws IllegalArgumentException om användaren inte finns
     */
    @Transactional(readOnly = true)
    public List<Booking> getMyOrders(Long userId) {
        // Kontrollera att användaren finns
        if (!userRepo.existsById(userId)) {
            throw new IllegalArgumentException("Användare med id " + userId + " hittades inte.");
        }

        // Hämta bokningar för användarens id
        return bookingRepo.findAllByUserId(userId);

    }
}
