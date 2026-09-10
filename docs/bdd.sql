DROP TABLE IF EXISTS chatXusuario;
DROP TABLE IF EXISTS mensajes;
DROP TABLE IF EXISTS chats;
DROP TABLE IF EXISTS usuarioWP;


CREATE TABLE usuarioWP ( 
    idUsuario INT PRIMARY KEY, 
    nombre VARCHAR(500), 
    mail VARCHAR(500), 
    contrasenia VARCHAR(500),
    foto VARCHAR(500)
); 

CREATE TABLE chats ( 
    idChat INT PRIMARY KEY,
    nombre VARCHAR(500),    
    esGrupo BOOLEAN,      
    foto VARCHAR(500)
);

CREATE TABLE mensajes ( 
    idMensaje INT PRIMARY KEY, 
    idChat INT, 
    idUsuario INT, 
    contenido VARCHAR(500), 
    fecha DATETIME,
    FOREIGN KEY (idChat) REFERENCES chats(idChat), 
    FOREIGN KEY (idUsuario) REFERENCES usuarioWP(idUsuario)
); 

CREATE TABLE chatXusuario (
    idChat INT,
    idUsuario INT,
    PRIMARY KEY (idChat, idUsuario),
    FOREIGN KEY (idChat) REFERENCES chats(idChat),
    FOREIGN KEY (idUsuario) REFERENCES usuarioWP(idUsuario)
);

INSERT INTO usuarioWP (idUsuario, nombre, mail, contrasenia, foto)
VALUES (1, 'ejemplo', 'ejemplo', 'pass', 'foto1'),
       (2, 'ej', 'ej', 'pass', 'foto2');
 
SELECT * FROM usuarioWP;
