DROP TABLE IF EXISTS `booking`;
CREATE TABLE `booking`
(
    `id`        bigint NOT NULL AUTO_INCREMENT,
    `active`    bit(1) NOT NULL,
    `car_id`    bigint NOT NULL,
    `from_date` date   NOT NULL,
    `to_date`   date   NOT NULL,
    `user_id`   bigint NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

LOCK
TABLES `booking` WRITE;
INSERT INTO `booking`
VALUES (1,  _binary '\0',  2, '2025-05-01', '2025-05-07', 4),
       (3,  _binary '', 6, '2025-05-01', '2025-05-07', 4),
       (4,  _binary '\0',  6, '2025-05-01', '2025-05-07', 6),
       (6,  _binary '\0',  4, '2025-05-05', '2025-05-07', 13),
       (7,  _binary '', 4, '2025-05-05', '2025-05-07', 6),
       (8,  _binary '', 4, '2025-05-25', '2025-06-07', 13),
       (9,  _binary '', 4, '2025-05-05', '2025-06-07', 13),
       (10, _binary '', 6, '2025-05-15', '2025-06-07', 13);
UNLOCK
TABLES;


DROP TABLE IF EXISTS `car`;
CREATE TABLE `car`
(
    `id`       bigint       NOT NULL AUTO_INCREMENT,
    `booked`   bit(1)       NOT NULL,
    `feature1` varchar(255) DEFAULT NULL,
    `feature2` varchar(255) DEFAULT NULL,
    `feature3` varchar(255) DEFAULT NULL,
    `image`    longblob,
    `model`    varchar(255) NOT NULL,
    `name`     varchar(255) NOT NULL,
    `price` double NOT NULL,
    `type`     varchar(20)  NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

LOCK
TABLES `car` WRITE;
INSERT INTO `car`
VALUES (2, _binary '\0', 'AC', 'Eluppvärmda backspeglar', 'CD växlare', NULL, 'M440I', 'BMW', 2999, 'Cab'),

       (4, _binary '\0', 'Rattvärme', 'Dragkrok', 'Keyless', NULL, 'V60', 'Volvo', 1899, 'Kombi'),

       (5, _binary '\0', 'Rattvärme', 'Dragkrok', 'Keyless', NULL, 'Enyaq', 'Skoda', 2499, 'El'),

       (6, _binary '\0', 'AWD', 'Panoramatak', 'Apple CarPlay', NULL, 'GLC', 'Mercedes', 2799, 'SUV');
UNLOCK
TABLES;


DROP TABLE IF EXISTS `user`;
CREATE TABLE `user`
(
    `id`           bigint       NOT NULL AUTO_INCREMENT,
    `email`        varchar(255) NOT NULL,
    `first_name`   varchar(255) NOT NULL,
    `last_name`    varchar(255) NOT NULL,
    `no_of_orders` int          NOT NULL,
    `password`     varchar(255) NOT NULL,
    `phone`        varchar(255) NOT NULL,
    `role`         varchar(255) NOT NULL,
    `username`     varchar(255) NOT NULL,

    PRIMARY KEY (`id`),
    UNIQUE KEY `UKob8kqyqqgmefl0aco34akdtpe` (`email`),
    UNIQUE KEY `UKsb8bbouer5wak8vyiiy4pf2bx` (`username`)

) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

LOCK
TABLES `user` WRITE;
INSERT INTO `user`
VALUES (1, 'tomas.wigell@wigellkoncernen.se', 'Tomas', 'Wigell', 0,
        '$2a$12$sO2ncqM9Ii6a.3KiS.vVwuWTbufHOIJMCn3cCRD71pZY2uCaI9zrC', '073972488', 'ROLE_ADMIN', 'admin'),

       (13, 'jerry.wigell@cat.se', 'Jerry', 'Wigell', 4, '$2a$12$LF0izXXC5C7D1X0BJv5WhuWjHSHXam3JDXwi7OIZNQzc2UVEqKzlK',
        '0739730926', 'ROLE_USER', 'user');
UNLOCK
TABLES;
