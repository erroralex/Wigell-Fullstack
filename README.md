# Wigell Rental – Biluthyrning (Frontend + Backend)

![Java](https://img.shields.io/badge/Java-21-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.4-6DB33F?style=for-the-badge&logo=spring&logoColor=white)
![MySQL](https://img.shields.io/badge/Databas-MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![Spring Security](https://img.shields.io/badge/Security-HTTP_Basic-6DB33F?style=for-the-badge&logo=springsecurity&logoColor=white)
![HTML CSS JS](https://img.shields.io/badge/Frontend-HTML_%2F_CSS_%2F_JS-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![WCAG](https://img.shields.io/badge/WCAG-AA_%2F_AAA-005A9C?style=for-the-badge&logoColor=white)

Ett bokningssystem för biluthyrning byggt som en del av Wigellkoncernens webbnärvaro. Backenden är ett Spring Boot REST API som även levererar en SPA-frontend skriven i ren HTML, CSS och JavaScript – utan ramverk.

---

## Sidor & Funktioner

### Hyrbilar (`#cars`)
Visar alla tillgängliga bilar i ett kortgalleri. Korten går att sortera på **namn**, **typ** och **pris** i stigande eller fallande ordning. Var femte kort är en annons för andra tjänster och/eller tjänster inom Wigellkoncernen. Man måste vara inloggad för att boka.

### Logga in / Skapa konto (`#login`)
Inloggning med användarnamn och lösenord. Sessionen sparas i `localStorage` så att man slipper logga in på nytt vid sidomladdning. Nya konton skapas via en dialogruta direkt på inloggningssidan.

### Mina Sidor (`#mina-sidor`)
Visar den inloggade användarens bokningar i en sorterbar tabell. Aktiva bokningar kan **returneras i förtid** – kostnaden räknas då om efter faktiskt antal hyrda dagar, med minst ett dygn som lägsta gräns. Bokningar kan också raderas.

### Administration – Bilar (`#admin-cars`)
*Kräver rollen `ADMIN`.*
Samtliga kolumner i biltabellen går att sortera i båda riktningarna. Bilar läggs till, redigeras och tas bort via dialogrutor. Bilduppladdning stöds och bilderna lagras direkt i databasen.

### Administration – Användare (`#admin-users`)
*Kräver rollen `ADMIN`.*
Visar och redigerar alla användarkonton. Klickar man på en användare visas bokningshistoriken i en dialogruta.

### Administration – Bokningar (`#admin-bookings`)
*Kräver rollen `ADMIN`.*
Fullständig bokningslista med möjlighet att filtrera fram enbart aktiva bokningar. Datum går att ändra och bokningar kan raderas.

### Styleguide (`#admin-styleguide`)
Dokumentation av Wigellkoncernens designsystem: färgschema, typografi, knappar, paneler, dialogrutor, formulär, tabeller och CSS-variabler. Varje komponent har ett kodexempel med kopieringsknapp.

---

## Kom igång

### Krav
* Java 21
* Maven
* MySQL Server (port 3306)

### 1. Sätt upp databasen
Skapa ett schema som heter `rental` i MySQL. Hibernate skapar tabellerna automatiskt vid uppstart och startdata läses in från `src/main/resources/data.sql`.

```sql
CREATE DATABASE rental;
```

Anslutningsuppgifterna konfigureras i `carRentalBackend/src/main/resources/application.properties` (standardvärden: `root`/`root`).

### 2. Starta applikationen

```bash
cd carRentalBackend
mvn spring-boot:run
```

Applikationen startar på `http://localhost:8080` och frontenden nås direkt i webbläsaren.

> **Live Server:** Frontenden kan också öppnas via VS Code Live Server på `http://127.0.0.1:5500` – den adressen är redan tillåten i CORS-inställningarna.

### 3. Testinloggning

| Roll    | Användarnamn | Lösenord |
|---------|--------------|----------|
| Kund    | `user`       | `user`   |
| Admin   | `admin`      | `admin`  |

---

## Tillgänglighet (WCAG)

Samtliga sidor ska uppfylla WCAG **AA-nivå**. Inloggnings-sektionen uppfyller **AAA-nivå**. Bland det som är implementerat:

* "Hoppa till"-länk till huvudinnehållet överst på sidan
* `aria-live`-regioner för felmeddelanden och dynamiskt innehåll
* `aria-sort` på alla kolumner i sorterbara tabeller
* Nativa `<dialog>`-element med `aria-modal` och `aria-labelledby`
* Synliga fokusmarkeringar och godkända kontrastförhållanden på alla interaktiva element

---

## Teknisk stack

* **Java 21 / Spring Boot 3.4** – REST API och statisk filservering
* **Spring Data JPA / Hibernate** – databasabstraktion mot MySQL, tabeller genereras automatiskt
* **Spring Security** – HTTP Basic-autentisering, BCrypt-lösenord, metodbaserad behörighetskontroll via `@PreAuthorize`
* **MySQL** – relationsdatabas för bilar, användare och bokningar
* **HTML / CSS / JavaScript** – SPA utan ramverk med hash-baserad navigering

---

## Licens

Distribueras under **MIT-licensen**.


---

<p align="center">
  <b>Utvecklad av</b><br>
  <img src="carRentalBackend/src/main/resources/alx_logo.png" width="120" alt="ALX Logo"><br>
  Copyright (c) 2026 Alexander Nilsson
</p>
