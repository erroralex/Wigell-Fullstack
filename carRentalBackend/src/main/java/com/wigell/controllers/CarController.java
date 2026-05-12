package com.wigell.controllers;

import com.wigell.entities.Car;
import com.wigell.services.CarService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/cars")
@CrossOrigin(origins = {"http://127.0.0.1:5500"}, allowCredentials = "true")
public class CarController {

    private final CarService carService;

    @Autowired
    public CarController(CarService carService) {
        this.carService = carService;
    }

    /**
     * Hämtar alla bilar.
     */
    //Testad
    @GetMapping
    public ResponseEntity<List<Car>> getAllCars() {
        List<Car> cars = carService.getAllCars();
        return ResponseEntity.ok(cars);
    }

    /**
     * Hämtar en specifik bil baserat på id.
     * Om bilen inte hittas returneras 404.
     */
    //Testad
    @GetMapping("/{id}")
    public ResponseEntity<Car> getCar(@PathVariable Long id) {
        Optional<Car> carOptional = carService.getCar(id);
        return carOptional.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    /**
     * Uppdaterar informationen för en specifik bil.
     * Om bilen inte hittas returneras 404.
     * Om en user försöker uppdatera returneras 403.
     */
    //Testad
    @PutMapping("/{id}")
    public ResponseEntity<?> updateCar(@PathVariable Long id, @RequestBody Car car) {
        car.setId(id);
        try {
            Car updatedCar = carService.updateCar(car);
            return ResponseEntity.ok(updatedCar);
        } catch (IllegalArgumentException e) {
            // När service kastar IllegalArgumentException("Car with id X not found")
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
          //  logger.error("Fel vid uppdatering av bil med id {}: {}", id, e.getMessage(), e);
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Ett internt fel uppstod"));
        }
    }



    /**
     * Tar bort en bil baserat på id.
     * Returnerar 204 No Content om lyckat,
     * 404 Not Found om bilen inte finns,
     * 500 Internal Server Error vid övriga fel.
     */
    //Testad
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteCar(@PathVariable Long id) {
        try {
            carService.deleteCarById(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            // Service kastar IllegalArgumentException("Car with id X not found")
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            // Oväntat fel
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Ett internt fel uppstod"));
        }
    }

    /**
     * Lägger till en ny bil med möjlighet att bifoga en bild.
     * Förväntar sig fält via formdata.
     */
    //Testad
    @PostMapping(path = "", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Car> addCar(
            @RequestParam("name") String name,
            @RequestParam("model") String model,
            @RequestParam("feature1") String feature1,
            @RequestParam("feature2") String feature2,
            @RequestParam("feature3") String feature3,
            @RequestParam("type") String type,
            @RequestParam("price") double price,
            @RequestParam("booked") boolean booked,
            @RequestParam(value="image", required=false) MultipartFile imageFile
    ) throws IOException {
        Car car = new Car(name, model, feature1, feature2, feature3, type, price, booked);
        if (imageFile != null && !imageFile.isEmpty()) {
            car.setImage(imageFile.getBytes());  // din LOB-array
        }
        Car saved = carService.addCar(car);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }


}
