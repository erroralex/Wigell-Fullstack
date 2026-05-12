# Kravspecifikation Projektarbete Frontend

## Bakgrund och syfte

Wigellkoncernen ska uppdatera sitt bokningssystem för biluthyrning och har bestämt att
det ska flyttas till ett webbaserat gränssnitt. Du har därför blivit utvald att implementera
en frontend till den redan existerande affärslogiken.

## Funktionella krav

**Inloggning** : Ska kunna ske med användarnamn och lösenord. Under utveckling och
demo ska user, user och admin, admin användas för detta. Det är ok att använda den
inbyggda funktionaliteten för inloggning under utvecklingsfasen.

**Design** : Det finns två förslag till designen på sidan. Se bilaga 1. Välj den som du anser
mest lämpad. En komplett styleguide ska bifogas projektet och innehållet i den ska
följas under utvecklingen. Om du har någon annan idé på design så kan du ta upp det
med koncernens VD innan du påbörjar arbetet

**Sortering:** Kunden ska kunna sortera bilarna på namn och typ. På en rad ska bas-
informationen om bilen finnas, samt en knapp där kunden kan välja bilen och komma
vidare till beställningen.

**Tabeller** för admin ska kunna sorteras både asc och desc för samtliga kolumner

**Säkerhet:** Implementeringen ska stödja CORS så att SPA-klienten kan komma åt REST
API:et. Basic security ska användas för inloggning av kunder och administratörer

### Arbetssätt och teknik

Både kundwebben och adminwebben ska utvecklas som en SPA med HTML, CSS och
JavaScript.

JQuery får användas

Samtliga endpoints i api:et ska göras tillgängliga via funktionalitet i webbapplikationen

Det är tillåtet att modifiera innehållet i data.sql. Det är dock inte tillåtet att modifiera
tabellnamn, kolumnnamn eller att på annat sätt reducera innehållet i databasen. Det är
dock fritt att ändra bilmodeller, utrustning, priser och annat. Det uppmuntras också att
använda bilder i webbapplikationen. Dessa kan då lagras i en lokal mapp och behöver
således inte infogas i databasen.

Mindre modifieringar av backenddelen får göras efter godkännande av koncernens VD


## Betygskrav

#### G

Samtliga ovanstående krav är uppfyllda.

Bootstrap, React, Angular eller liknande ramverk får användas efter överenskommelse
med koncernens VD

#### VG

Samtliga krav för G är uppfyllda.

För VG får dock inga ramverk användas. Applikationen måste byggas med hjälp av HTML,
CSS och JavaScript.

Hela din spa ska följa WCAG’s AA-nivå och minst en sida ska följa WCAG’s AAA-nivå

Applikationen ska lämnas in i tid och vara utförd enligt kravspecifikationen. Den
studerande ska även med god säkerhet redovisa/dema applikationen


_Bilaga 1_

Designförslag 1

```
Logga Navigation
```
```
Dynamiskt innehåll
```
```
Reklamplatser
```

---
Designförslag 2
```
Logga
```
```
Navigation Reklamplats
```
```
Dynamiskt innehåll
```

