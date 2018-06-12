const express = require('express');
const path = require('path');
const fs = require('fs');
const http = require('http');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const app = express();
const server = http.createServer(app);
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);

const jsonfile = require('jsonfile');
const fileVersionControl = 'package.json';
const currentStatic = require('./gulp/config').root;
const config = require('./config');
// получаем абсолютный путь к папке upload, в которую будут загружаться картинки
// проектов
const uploadDir = path.join(__dirname, config.upload);
//подключаем модули
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose
    .connect(`mongodb://${config.db.host}:${config.db.port}/${config.db.name}`, {
        user: config.db.user,
        pass: config.db.password
    })
    .catch(e => {
        console.error(e);
        throw e;
    });

require('./models/db-close');
//подключаем модели(сущности, описывающие коллекции базы данных)
require('./models/blog');
require('./models/site');
require('./models/user');
require('./models/skills');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

const LOCALS = './views/data/content.json';
app.locals = Object.assign(this, JSON.parse(fs.readFileSync(LOCALS, 'utf-8')));

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(session({
    secret: 'secret',
    key: 'keys',
    cookie: {
        path: '/',
        httpOnly: true,
        maxAge: null
    },
    saveUninitialized: false,
    resave: false,
    store: new MongoStore({mongooseConnection: mongoose.connection})
}));
app.use(express.static(path.join(__dirname, currentStatic)));


app.use('/', require('./routes/index'));
app.use('/about', require('./routes/about'));
app.use('/admin', require('./routes/admin'));
app.use('/blog', require('./routes/blog'));
app.use('/works', require('./routes/works'));

// 404 catch-all handler (middleware)
app.use(function (req, res, next) {
    res.status(404);
    res.render('404');
});

// 500 error handler (middleware)
app.use(function (err, req, res, next) {
    console.error(err.stack);
    res.status(500);
    res.render('500');
});

server.listen(80, '0.0.0.0');
server.on('listening', function () {
    jsonfile
        .readFile(fileVersionControl, function (err, obj) {
            if (err) {
                console.log('Данные для хеширования ресурсов из package.json не прочитаны');
                console.log('Сервер остановлен');
                process.exit(1);
            } else {
                app.locals.settings = {
                    suffix: '.min',
                    version: obj.version
                };
                console.log('Данные для хеширования ресурсов из package.json прочитаны');

                //если такой папки нет - создаем ее
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir);
                }

                console.log('Express server started on port %s at %s', server.address().port, server.address().address);
            }
        });
});