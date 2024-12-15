const sqlite = require('sqlite3');

// Connect to SQLite database
const db = new sqlite.Database('dates_shop.db', (err) => {
    if (err) {
        console.error('Error connecting to SQLite database:', err);
    } else {
        console.log('Connected to SQLite database');
    }
});

// SQL for creating the tables
const createUserTable = `
CREATE TABLE IF NOT EXISTS USERS (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    NAME TEXT NOT NULL,
    EMAIL TEXT UNIQUE NOT NULL,
    PASSWORD TEXT NOT NULL,
    ISADMIN INT DEFAULT 0
)`;

const createProductTable = `
CREATE TABLE IF NOT EXISTS PRODUCTS (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    NAME TEXT NOT NULL,
    DESCRIPTION TEXT,
    PRICE REAL NOT NULL,
    STOCK INT NOT NULL
)`;

const createOrderTable = `
CREATE TABLE IF NOT EXISTS ORDERS (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    USER_ID INT NOT NULL,
    PRODUCT_ID INT NOT NULL,
    QUANTITY INT NOT NULL,
    ORDER_DATE TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (USER_ID) REFERENCES USERS(ID) ON DELETE CASCADE,
    FOREIGN KEY (PRODUCT_ID) REFERENCES PRODUCTS(ID) ON DELETE CASCADE
)`;

const createCartTable = `
CREATE TABLE IF NOT EXISTS CART (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    USER_ID INT NOT NULL,
    PRODUCT_ID INT NOT NULL,
    QUANTITY INT NOT NULL,
    DATE_ADDED TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (USER_ID) REFERENCES USERS(ID) ON DELETE CASCADE,
    FOREIGN KEY (PRODUCT_ID) REFERENCES PRODUCTS(ID) ON DELETE CASCADE
)`;

// Add a trigger to decrement stock when an order is placed
const createStockTrigger = `
CREATE TRIGGER IF NOT EXISTS DecrementStock
AFTER INSERT ON ORDERS
FOR EACH ROW
BEGIN
    UPDATE PRODUCTS
    SET STOCK = STOCK - NEW.QUANTITY
    WHERE ID = NEW.PRODUCT_ID;
END;
`;

// Function to initialize the database and create tables
const initializeDatabase = () => {
    db.serialize(() => {
        db.run(createUserTable, (err) => {
            if (err) console.error('Error creating USERS table:', err);
        });
        db.run(createProductTable, (err) => {
            if (err) console.error('Error creating PRODUCTS table:', err);
        });
        db.run(createOrderTable, (err) => {
            if (err) console.error('Error creating ORDERS table:', err);
        });
        db.run(createCartTable, (err) => {
            if (err) console.error('Error creating CART table:', err);
        });
        db.run(createStockTrigger, (err) => {
            if (err) console.error('Error creating stock trigger:', err);
        });
    });
};

module.exports = { db, initializeDatabase };
