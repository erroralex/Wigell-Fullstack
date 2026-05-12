package com.wigell.entities;

import jakarta.persistence.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Collections;
import java.util.Objects;

@Entity
@Table(name = "user")  // Notera att "user" är ett reserverat ord i vissa databaser, så det kan vara bra att använda backticks eller byta namn (dock behöver du inte göra det här)
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "first_name", nullable = false)
    private String firstName;

    @Column(name = "last_name", nullable = false)
    private String lastName;

    @Column(name = "username", nullable = false, unique = true)
    private String username;

    @Column(nullable = false)
    private String phone;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false, length = 64)
    private String password;

    @Column(name = "no_of_orders", nullable = false)
    private int noOfOrders;

    @Column(name = "role", nullable = false)
    private String role;

    // Tom konstruktor för JPA
    public User() {
    }

    public User(String firstName, String lastName, String username, String phone, String email, String password, int noOfOrders, String role) {
        this.firstName = firstName;
        this.lastName = lastName;
        this.username = username;
        this.phone = phone;
        this.email = email;
        this.password = password;
        this.noOfOrders = noOfOrders;
        this.role = role;
    }

    // Getters och Setters

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    @Override
    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    @Override
    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public int getNoOfOrders() {
        return noOfOrders;
    }

    public void setNoOfOrders(int noOfOrders) {
        this.noOfOrders = noOfOrders;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    // Implementering av metoder från UserDetails

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        // Vi returnerar en lista med en single authority baserad på roll-strängen.
        return Collections.singletonList(new SimpleGrantedAuthority(role));
    }

    @Override
    public boolean isAccountNonExpired() {
        return true; // Anpassa vid behov
    }

    @Override
    public boolean isAccountNonLocked() {
        return true; // Anpassa vid behov
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true; // Anpassa vid behov
    }

    @Override
    public boolean isEnabled() {
        return true; // Anpassa vid behov
    }

    /**
     * Metoden kontrollerar om två objekt är lika.
     * Objekten anses lika om de har samma id.
     */
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof User)) return false;
        User user = (User) o;
        return Objects.equals(id, user.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return "User{" +
                "id=" + id +
                ", firstName='" + firstName + '\'' +
                ", lastName='" + lastName + '\'' +
                ", username='" + username + '\'' +
                ", phone='" + phone + '\'' +
                ", email='" + email + '\'' +
                ", noOfOrders=" + noOfOrders +
                ", role='" + role + '\'' +
                '}';
    }
}
