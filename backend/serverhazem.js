const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const dbAccess = require('./databasehazem.js'); // Import the database module

const server = express();
const port = 3000;
const secret_key = 'DdsdsdKKFDDFDdvfddvxvc4dsdvdsvdb';

server.use(cors({
    origin: "http://localhost:3000",
    credentials: true
}));
server.use(express.json());
server.use(cookieParser());

// Initialize database
dbAccess.initializeDatabase();
const db = dbAccess.db;

// Helper functions
const generateToken = (id, isAdmin) => {
    return jwt.sign({ id, isAdmin }, secret_key, { expiresIn: '1h' });
};

const verifyToken = (req, res, next) => {
    const token = req.cookies.authToken;
    if (!token) return res.status(401).send('Unauthorized');

    jwt.verify(token, secret_key, (err, details) => {
        if (err) return res.status(403).send('Invalid or expired token');
        req.userDetails = details;
        next();
    });
};

// Routes

// User registration
server.post('/user/register', (req, res) => {
    const { name, email, password } = req.body;
    bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) return res.status(500).send('Error hashing password');

        db.run(`INSERT INTO USERS (NAME, EMAIL, PASSWORD, ISADMIN) VALUES (?, ?, ?, 0)`, [name, email, hashedPassword], (err) => {
            if (err) return res.status(400).send('Error during registration');
            return res.status(200).send('Registration successful');
        });
    });
});

// User login
server.post('/user/login', (req, res) => {
    const { email, password } = req.body;
    db.get(`SELECT * FROM USERS WHERE EMAIL = ?`, [email], (err, user) => {
        if (err || !user) return res.status(401).send('Invalid credentials');

        bcrypt.compare(password, user.PASSWORD, (err, isMatch) => {
            if (err || !isMatch) return res.status(401).send('Invalid credentials');

            const token = generateToken(user.ID, user.ISADMIN);
            res.cookie('authToken', token, {
                httpOnly: true,
                sameSite: 'none',
                secure: true,
                maxAge: 3600000
            });
            return res.status(200).json({ id: user.ID, admin: user.ISADMIN });
        });
    });
});

// Add a product
server.post('/products/add', verifyToken, (req, res) => {
    if (!req.userDetails.isAdmin) return res.status(403).send('You are not an admin');

    const { name, description, price, stock } = req.body;
    db.run(`INSERT INTO PRODUCTS (NAME, DESCRIPTION, PRICE, STOCK) VALUES (?, ?, ?, ?)`, [name, description, price, stock], (err) => {
        if (err) return res.status(500).send('Error adding product');
        return res.status(200).send('Product added successfully');
    });
});

// Fetch products
server.get('/products', (req, res) => {
    db.all(`SELECT * FROM PRODUCTS`, [], (err, products) => {
        if (err) return res.status(500).send('Error fetching products');
        return res.status(200).json(products);
    });
});

// Add to cart
server.post('/cart/add', verifyToken, (req, res) => {
    const { productId, quantity } = req.body;
    const userId = req.userDetails.id;

    db.run(`INSERT INTO CART (USER_ID, PRODUCT_ID, QUANTITY) VALUES (?, ?, ?)`, [userId, productId, quantity], (err) => {
        if (err) return res.status(500).send('Error adding to cart');
        return res.status(200).send('Added to cart');
    });
});

// View cart
server.get('/cart', verifyToken, (req, res) => {
    const userId = req.userDetails.id;

    db.all(
        `SELECT CART.ID, PRODUCTS.NAME, PRODUCTS.PRICE, CART.QUANTITY 
        FROM CART 
        INNER JOIN PRODUCTS ON CART.PRODUCT_ID = PRODUCTS.ID 
        WHERE CART.USER_ID = ?`,
        [userId],
        (err, cart) => {
            if (err) return res.status(500).send('Error fetching cart');
            return res.status(200).json(cart);
        }
    );
});

// Place an order
server.post('/orders/place', verifyToken, (req, res) => {
    const userId = req.userDetails.id;
    const { cartItems } = req.body;

    const placeholders = cartItems.map(() => `(?, ?, ?)`).join(',');
    const orderValues = cartItems.flatMap(item => [userId, item.productId, item.quantity]);

    db.serialize(() => {
        db.run(
            `INSERT INTO ORDERS (USER_ID, PRODUCT_ID, QUANTITY) VALUES ${placeholders}`,
            orderValues,
            (err) => {
                if (err) return res.status(500).send('Error placing order');
            }
        );

        db.run(`DELETE FROM CART WHERE USER_ID = ?`, [userId], (err) => {
            if (err) return res.status(500).send('Error clearing cart');
            return res.status(200).send('Order placed successfully');
        });
    });
});

server.listen(port, () => {
    console.log(`Server started at port ${port}`);
});
