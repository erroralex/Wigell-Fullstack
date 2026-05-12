package com.wigell.dao;

import com.wigell.entities.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
public interface UserRepo extends JpaRepository<User, Long> {

        /**
         * Hämtar en användare baserat på användarnamn.
         *
         * @param username det användarnamn som ska hämtas
         * @return ett Optional med användaren, om den finns
         */
        Optional<User> findByUsername(String username);

        // Här kan du lägga till fler metoder om det behövs, exempelvis:
        // Optional<User> findByEmail(String email);
}

