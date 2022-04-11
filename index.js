const express = require('express');
const mongoose = require('mongoose');

const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const {
    GridFsStorage
  } = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');
const cors = require('./middlewares/cors');
const catalogController = require('./controllers/catalog');
const usersController = require('./controllers/users');
const auth = require('./middlewares/auth');

require('dotenv')
    .config();


start();

// Mongo URI
const mongoURI = 'mongodb://localhost:27017/audioplayer';

async function start() {
    try {
        await mongoose.connect('mongodb://localhost:27017/audioplayer', {
            useUnifiedTopology: true,
            useNewUrlParser: true
        });
        console.log('Database ready');
    } catch (err) {
        console.error('Database connection failed');
        process.exit(1);
    }

    const app = express();

    //creating bucket
    let bucket;
    mongoose.connection.on('connected', () => {
        var db = mongoose.connections[0].db;
        bucket = new mongoose.mongo.GridFSBucket(db, {
            bucketName: 'newBucket'
        });
        console.log(bucket);
    });

    app.use(bodyParser.json());
    app.use(methodOverride('_method'));
    app.set('view engine', 'ejs');
    app.set('views', __dirname + '/views');


    // Create mongo connection
    const conn = mongoose.createConnection(mongoURI);

    // Init gfs
    let gfs;

    conn.once('open', () => {
        // Init stream
        gfs = Grid(conn.db, mongoose.mongo);
        gfs.collection('uploads');
    });

    // Create storage engine
    const storage = new GridFsStorage({
        url: mongoURI,
        file: (req, file) => {
            return new Promise((resolve, reject) => {
                const filename = file.originalname;
                const fileInfo = {
                    filename: filename,
                    bucketName: 'uploads'
                };
                resolve(fileInfo);
            });
        }
    });

    const upload = multer({ storage });

    app.use(express.json());
    app.use(cors());
    app.use(auth());
    app.use('/data/catalog', catalogController);
    app.use('/users', usersController);

    app.get('/', (req, res) => res.render('index'));

    app.post('/upload', upload.single('file'), (req, res) => {
        res.redirect('/');
      });

    app.listen(3030, () => console.log('REST service started on port 3030'));
}