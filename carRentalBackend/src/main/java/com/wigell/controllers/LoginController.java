package com.wigell.controllers;

import com.wigell.entities.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@CrossOrigin(origins = {"http://127.0.0.1:5500"}, allowCredentials = "true")
public class LoginController {

    private final PasswordEncoder passwordEncoder;
    private final UserDetailsService userDetailsService;

    @Autowired
    public LoginController(PasswordEncoder passwordEncoder, UserDetailsService userDetailsService){
        this.passwordEncoder = passwordEncoder;
        this.userDetailsService = userDetailsService;
    }

    /**
     * Autentiserar en användare baserat på inloggningsuppgifter (användarnamn och lösenord).
     * Vid lyckad autentisering returneras en JSON med användarnamnet och en flagga (isAdmin) som anger om användaren har administratörsbehörighet (true) eller inte (false)
     * samt användarens id.
     * Vid misslyckad inloggning returneras ett felmeddelande med status 401.
     *
     * @param loginRequest Map med nycklarna "username" och "password".
     * @return ResponseEntity med ett JSON-objekt
     */
    //Testad
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> loginRequest) {
        String username = loginRequest.get("username");
        String password = loginRequest.get("password");

        try {
            User user = (User) userDetailsService.loadUserByUsername(username);

            if (!passwordEncoder.matches(password, user.getPassword())) {
                throw new Exception("Invalid credentials");
            }

            boolean isAdmin = user.getAuthorities().stream()
                    .anyMatch(auth -> auth.getAuthority().equals("ROLE_ADMIN"));

            Map<String, Object> response = new HashMap<>();
            response.put("userId", user.getId());
            response.put("username", user.getUsername());
            response.put("isAdmin", isAdmin);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(401)
                    .body(Map.of("error", "Invalid credentials"));
        }
    }
}
