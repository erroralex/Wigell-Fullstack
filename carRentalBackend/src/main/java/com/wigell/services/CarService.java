package com.wigell.services;

import com.wigell.dao.CarRepo;
import com.wigell.entities.Car;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
// import org.springframework.beans.factory.annotation.Value; // Ej längre nödvändig när vi lagrar i databasen
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

@Service
public class CarService {

    private static final Logger logger = LoggerFactory.getLogger(CarService.class);
    private final CarRepo carRepo;

    @Autowired
    public CarService(CarRepo carRepo) {
        this.carRepo = carRepo;
    }

    public List<Car> getAllCars() {
        return carRepo.findAll();
    }

    public Car addCar(Car car) {
        Car savedCar = carRepo.save(car);
        logger.info("New car added: id={}, name={}, model={}", savedCar.getId(), savedCar.getName(), savedCar.getModel());
        return savedCar;
    }

/*    public Car updateCar(Car updatedCar) {
        Optional<Car> optionalCar = carRepo.findById(updatedCar.getId());
        if (optionalCar.isPresent()) {
            Car existingCar = optionalCar.get();
            existingCar.setName(updatedCar.getName());
            existingCar.setModel(updatedCar.getModel());
            existingCar.setPrice(updatedCar.getPrice());
            existingCar.setType(updatedCar.getType());
            existingCar.setFeature1(updatedCar.getFeature1());
            existingCar.setFeature2(updatedCar.getFeature2());
            existingCar.setFeature3(updatedCar.getFeature3());
            existingCar.setBooked(updatedCar.isBooked());
            Car savedCar = carRepo.save(existingCar);
            logger.info("Car updated: id={}", savedCar.getId());
            return savedCar;
        } else {
            logger.error("Car with id {} not found for update", updatedCar.getId());
            throw new IllegalArgumentException("Car with id " + updatedCar.getId() + " not found.");
        }
    }*/
    public Car updateCar(Car updatedCar) {
        Optional<Car> optionalCar = carRepo.findById(updatedCar.getId());
        if (optionalCar.isEmpty()) {
            throw new IllegalArgumentException("Car with id "
                    + updatedCar.getId() + " not found");
        }
        Car existingCar = optionalCar.get();
        existingCar.setName(updatedCar.getName());
        existingCar.setModel(updatedCar.getModel());
        existingCar.setPrice(updatedCar.getPrice());
        existingCar.setType(updatedCar.getType());
        existingCar.setFeature1(updatedCar.getFeature1());
        existingCar.setFeature2(updatedCar.getFeature2());
        existingCar.setFeature3(updatedCar.getFeature3());
        existingCar.setBooked(updatedCar.isBooked());
        return carRepo.save(existingCar);
    }


/*    public void deleteCarById(Long id) {
        if (carRepo.existsById(id)) {
            carRepo.deleteById(id);
            logger.info("Car deleted: id={}", id);
        } else {
            logger.warn("Attempted to delete non-existing car: id={}", id);
            throw new IllegalArgumentException("Car with id " + id + " not found.");
        }
    }*/
    @Transactional
    public void deleteCarById(Long id) {
        if (carRepo.existsById(id)) {
            carRepo.deleteById(id);
            logger.info("Car deleted: id={}", id);
        } else {
            logger.warn("Attempted to delete non-existing car: id={}", id);
            throw new IllegalArgumentException("Car with id " + id + " not found.");
        }
    }

    public Optional<Car> getCar(Long id) {
        return carRepo.findById(id);
    }

    /**
     * Sparar bilens bild i databasen genom att uppdatera bilens image-fält.
     *
     * @param id   bilens id
     * @param file MultipartFile med bilens bild
     */
    public void saveCarImageToDb(long id, MultipartFile file) {
        try {
            Optional<Car> optionalCar = carRepo.findById(id);
            if (optionalCar.isPresent()) {
                Car car = optionalCar.get();
                // Sätt image-fältet med filens innehåll
                car.setImage(file.getBytes());
                carRepo.save(car);
                logger.info("Image saved in DB for car id={}", Optional.of(id));
            } else {
                logger.error("Car with id {} not found to save image", Optional.of(id));
                throw new IllegalArgumentException("Car with id " + id + " not found.");
            }
        } catch (IOException e) {
            logger.error("Error saving image to DB for car id={}: {}", Optional.of(id), e.getMessage());
            throw new RuntimeException("Error uploading file", e);
        }
    }
}
