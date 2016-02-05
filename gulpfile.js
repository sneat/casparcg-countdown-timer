var gulp = require('gulp');
var browserify = require('browserify');
var babelify = require('babelify');
var source = require('vinyl-source-stream');
var less = require('gulp-less');
var watch = require('gulp-watch');
var path = require('path');
var glob = require('glob');
var gulpUtil = require('gulp-util');
var replace = require('gulp-replace');
var concat = require('gulp-concat');
var cssnano = require('gulp-cssnano');
var sourcemaps = require('gulp-sourcemaps');
var fs = require('fs');
var del = require('del');
var newer = require('gulp-newer');
var watchify = require('watchify');
var jsonfile = require('jsonfile');

var sourcePath = './src';
var destPath = './casparcg_output';
var themeBasePath = sourcePath + '/themes';
/** @var {string} The name of the theme to build for */
var themeName = 'base';
var themePath = themeBasePath + '/' + themeName;
var cssPath = destPath + '/css';
var cssFile = 'main.css';
var filesToCopy = [
    sourcePath + '/*.html'
];

/**
 * Makes the error pretty, and prevents watch from failing
 */
function handleBuildErrors() {
    var args = Array.prototype.slice.call(arguments);
    displayConsoleError('Error compiling!');
    displayConsoleError(args.toString());
    this.emit('end');
}

function displayConsoleError(message) {
    gulpUtil.log(gulpUtil.colors.bgRed.white("  " + message + "  "));
}

function displayConsoleSuccess(message) {
    gulpUtil.log(gulpUtil.colors.bgGreen.black(" " + message + " "));
}

function displayConsoleInfo(message) {
    gulpUtil.log(gulpUtil.colors.cyan(message));
}

/**
 * Check that the user has provided a theme name, and that it is valid
 * @returns {boolean}
 */
function checkForTheme() {
    themeName = gulpUtil.env.theme;
    if (typeof themeName == 'undefined') {
        themeName = 'base';
    }
    try {
        var dir = themeBasePath + '/' + themeName;
        var stats = fs.lstatSync(dir);
        if (stats.isDirectory()) {
            displayConsoleInfo('Using theme: "' + themeName + '"');
            themePath = themeBasePath + '/' + themeName;
            return true;
        }
    } catch (e) {
        displayConsoleError('Error: Theme "' + themeName + '" does not exist at ' + dir);
        return false;
    }
}

function getFolders(dir) {
    return fs.readdirSync(dir)
        .filter(function (file) {
            return fs.statSync(path.join(dir, file)).isDirectory();
        });
}

gulp.task('default', function () {
    var themes = getThemes(themeBasePath);
    displayConsoleInfo('List of commands to use');
    displayConsoleInfo('');
    displayConsoleInfo('gulp build: Compiles the React and theme files and then watches for changes.');
    displayConsoleInfo('');
    displayConsoleInfo('Specify the theme that you want to use with: gulp build --theme "<theme name>"');
    displayConsoleInfo('    e.g. gulp build --theme "' + themes[Math.floor(Math.random() * themes.length)] + '"');
    displayConsoleInfo('');
    listThemes();
    displayConsoleInfo('');
    displayConsoleSuccess('Happy Coding!');
});

function getThemes(dir) {
    return getFolders(dir);
}

function listThemes() {
    var themes = getThemes(themeBasePath);
    displayConsoleInfo('List of themes available: "' + themes.join('", "') + '"');
}

gulp.task('build', ['check-for-theme', 'clean', 'compile-scripts', 'copy-all', 'copy-lib', 'compile-styles'], function () {
    displayConsoleSuccess('Built. Check "' + destPath + '" for output.');
    displayConsoleInfo('Watching for changes...');
    gulp.watch(themePath + '/css/*.+(less|css)', ['compile-styles']).on('change', function(file) {
        var filename = file.path.split('/').pop();
        displayConsoleInfo('Detected change in ' + filename + ', re-compiling...');
    });
    gulp.watch(filesToCopy.concat([themePath + '/!(css|js)/**']), ['copy-all']).on('change', function(file) {
        var filename = file.path.split('/').pop();
        displayConsoleInfo('Detected change in ' + filename + ', re-compiling...');
    });
});

gulp.task('compile-scripts', function () {
    var files = glob.sync(themePath + '/**/*.js');
    files.unshift('./src/app.jsx');
    var props = {
        entries: files,
        //extensions: ['.jsx'],
        debug: true,
        transform: babelify.configure(),
        cache: {},
        packageCache: {},
        fullPaths: true
    };
    var bundler = watchify(browserify(props));
    var jsFilePath = destPath + '/js';
    var jsFileName = 'main.js';

    function rebundle() {
        var stream = bundler.bundle();
        return stream
            .on('error', handleBuildErrors)
            .pipe(source(jsFileName))
            .pipe(gulp.dest(jsFilePath));
    }

    // listen for an update and run rebundle
    bundler.on('update', function () {
        displayConsoleInfo('Changes detected, re-compiling...');
        rebundle();
        displayConsoleSuccess(jsFilePath + '/' + jsFileName + ' re-compiled!');
    });

    // run it once the first time buildScript is called
    return rebundle();
});

gulp.task('copy-all', false, function () {
    return gulp
        .src(filesToCopy.concat([themePath + '/!(css|js)/**']))
        .pipe(newer(destPath))
        .pipe(gulp.dest(destPath));
});

gulp.task('copy-lib', false, function () {
    return jsonfile.readFile(themePath + '/lib.json', function (err, obj) {
        if (obj) {
            if (obj.js && obj.js.length) {
                gulp.src(obj.js)
                    .pipe(newer(destPath + '/js'))
                    .pipe(gulp.dest(destPath + '/js'));
            }
            if (obj.css && obj.css.length) {
                gulp.src(obj.css)
                    .pipe(newer(destPath + '/css'))
                    .pipe(gulp.dest(destPath + '/css'));
            }
            if (obj.path && obj.path.length) {
                gulp.src(obj.path)
                    .pipe(newer(destPath))
                    .pipe(gulp.dest(destPath));
            }
        }
    });
});

gulp.task('check-for-theme', function (cb) {
    checkForTheme();
    cb();
});

gulp.task('clean', function (cb) {
    del([destPath + '/*']);
    cb();
});

gulp.task('compile-styles', function () {
    return gulp.src(themePath + '/css/*.+(less|css)')
        .pipe(sourcemaps.init())
        .pipe(less({
            paths: [path.join(__dirname, 'less', 'includes')]
        }).on('error', handleBuildErrors))
        .pipe(sourcemaps.write())
        .pipe(concat(cssFile))
        .pipe(gulp.dest(cssPath));
});