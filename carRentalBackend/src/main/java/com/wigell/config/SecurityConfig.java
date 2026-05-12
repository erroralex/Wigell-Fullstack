package com.wigell.config;

import com.wigell.dao.UserRepo;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.Collections;

import static org.springframework.security.config.Customizer.withDefaults;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * UserDetailsService bean som hämtar användardata från databasen via UserRepository.
     */
    @Bean
    public UserDetailsService userDetailsService(UserRepo userRepo) {
        return username -> userRepo.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("Användare med namn " + username + " hittades inte."));
    }

    /**
     * Konfigurerar säkerhetsfilterkedjan.
     * Inkluderar:
     * - Öppen åtkomst till landingssidan ("/")
     * - CSRF-inaktivering (för API-baserade lösningar, var försiktig i produktion)
     * - CORS-konfiguration
     * - Specifika regler för API-endpoints
     * - HTTP Basic Authentication
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .authorizeHttpRequests(authorize -> authorize
                        // Öppna endpoints eller endpoints som har metodkontroll
                        .requestMatchers(HttpMethod.GET, "/api/v1/").permitAll() //Finns tillgänglig om någon vill bygga en landing page, ej skapad
                        .requestMatchers(HttpMethod.POST, "/api/v1/auth/login").permitAll() //Testad
                        .requestMatchers(HttpMethod.GET, "/api/v1/cars").permitAll() //Testad
                        .requestMatchers(HttpMethod.POST, "/api/v1/users").permitAll() //Testad
                        .requestMatchers(HttpMethod.GET, "/api/v1/bookings/**").permitAll() //Testad

                        // Bilrelaterade endpoints
                        .requestMatchers(HttpMethod.GET, "/api/v1/cars/**").authenticated() //Testad
                        .requestMatchers(HttpMethod.POST, "/api/v1/cars").hasRole("ADMIN") //Testad
                        .requestMatchers(HttpMethod.PUT, "/api/v1/cars/**").hasRole("ADMIN") //Testad
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/cars/**").hasRole("ADMIN") //Testad

                        // Användarrelaterade endpoints
                        // GET-endpoints för att hämta användare är begränsade (ex. admin eller inloggad användare)
                        .requestMatchers(HttpMethod.GET, "/api/v1/users").hasRole("ADMIN") //Testad
                        .requestMatchers(HttpMethod.PUT, "/api/v1/users/**").authenticated() //Testad
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/users/**").hasRole("ADMIN") //Testad
                        .requestMatchers(HttpMethod.GET, "/api/v1/users/**").authenticated() //Testad

                        // Bokningsrelaterade endpoints
                        .requestMatchers(HttpMethod.POST, "/api/v1/bookings").hasRole("USER") //Testad
                        .requestMatchers(HttpMethod.PUT, "/api/v1/bookings/**").hasRole("ADMIN") //Testad
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/bookings/**").hasRole("ADMIN") //Testad


                        // Alla övriga endpoints kräver autentisering
                        .anyRequest().authenticated()
                )
                .httpBasic(withDefaults())
                .headers(headers -> headers.frameOptions(frameOptions -> frameOptions.disable()));

        return http.build();
    }

    /**
     * Konfigurerar CORS för att hantera cross-origin-förfrågningar.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowCredentials(true);

        configuration.setAllowedOrigins(Arrays.asList(
                "http://127.0.0.1:5500",
                "http://localhost:5500",
                "http://localhost:8080"
        ));

        configuration.setAllowedHeaders(Arrays.asList("Origin", "Content-Type", "Accept", "Authorization"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);

        return source;
    }
}
