CREATE TABLE usuarioWP ( 
    idUsuario INT PRIMARY KEY, 
    nombre VARCHAR(500), 
    mail VARCHAR(500), 
    contrasenia VARCHAR(500) 
); 

CREATE TABLE chats ( 
    idChat INT PRIMARY KEY,
    nombre VARCHAR(500),    
    esGrupo BOOLEAN         
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

