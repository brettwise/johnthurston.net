// Define variables.
var appendPrepend  = require('gulp-append-prepend');
var autoprefixer   = require('autoprefixer');
var browserSync    = require('browser-sync').create();
var cleancss       = require('gulp-clean-css');
var uncss          = require('gulp-uncss');
var critical       = require('critical').stream;
var concat         = require('gulp-concat');
var del            = require('del');
var gulp           = require('gulp');
var gutil          = require('gulp-util');
var imagemin       = require('gulp-imagemin');
var htmlmin        = require('gulp-htmlmin');
var jpegRecompress = require('imagemin-jpeg-recompress');
var notify         = require('gulp-notify');
var postcss        = require('gulp-postcss');
var rename         = require('gulp-rename');
var run            = require('gulp-run');
var runSequence    = require('run-sequence');
var sass           = require('gulp-ruby-sass');
var sourcemaps     = require('gulp-sourcemaps');
var uglify         = require('gulp-uglify');

var paths          = require('./_assets/gulp_config/paths');


// Compiles SCSS to css, adding sourcemaps and vendor prefixes
// and then outputs the file to the appropriate location.
// Finally fires off browsersync to inject new styles.
gulp.task('build:styles:main', function() {
  return sass(paths.sassFiles + '/main.scss', {
    trace: true,
    sourcemap: true,
    loadPath: [paths.sassFiles]
  })
  .pipe(sourcemaps.write())
  .pipe(postcss([ autoprefixer({ browsers: ['last 2 versions'] }) ]))
  .pipe(gulp.dest(paths.jekyllCssFiles))
  .pipe(gulp.dest(paths.siteCssFiles))
  .pipe(browserSync.stream())
  .on('error', gutil.log);
});

// Does the same as above but removes sourcemaps
// and browsersync. It minifies files and removes inline comments
// before sending to postcss to get vendor prefixes.
gulp.task('build:styles:main:prod', function() {
  return sass(paths.sassFiles + '/main.scss', {
    style: 'compressed',
    trace: true,
    loadPath: [paths.sassFiles]
  })
  .pipe(postcss([ autoprefixer({ browsers: ['last 2 versions'] }) ]))
  .pipe(cleancss())
  .pipe(gulp.dest(paths.jekyllCssFiles))
  .pipe(gulp.dest(paths.siteCssFiles))
  .on('error', gutil.log);
});

// Inlines CSS needed to render above the fold content
// to be included in head.html so FOUC is avoided.
gulp.task('build:styles:critical', function() {
  return gulp.src('_site/index.html')
  .pipe(critical({
    base: '_site/',
    inline: true,
    css: ['_site/assets/styles/main.css'],
    dimensions: [
      {
        width: 414,
        height: 716
      },
      {
        width: 1920,
        height: 1080
      }
    ],
    dest: '_includes/critical.css', // Outputting so you can check to make sure it doesn't go over 10kb
    minify: true
  }))
  .on('error', function(err) { gutil.log(gutil.colors.red(err.message)); })
  .pipe(gulp.dest('_site'));
});

// Copies any other CSS files to the assets directory, to be used by pages/posts
// that specify custom CSS files.
gulp.task('build:styles:css', function() {
  return gulp.src([paths.sassFiles + '/*.css'])
  .pipe(postcss([ autoprefixer({ browsers: ['last 2 versions'] }) ]))
  .pipe(cleancss())
  .pipe(gulp.dest(paths.jekyllCssFiles))
  .pipe(gulp.dest(paths.siteCssFiles))
  .on('error', gutil.log);
});

// Removes unreferenced CSS classes. Used for prod task.
gulp.task('build:styles:uncss', function() {
  return gulp.src([paths.siteCssFiles + '/main.css'])
  .pipe(uncss({
    html: ["./_site/**/*.html"]
  }))
  .pipe(gulp.dest(paths.siteCssFiles))
  .on('error', gutil.log);
});


// Minify HTML
gulp.task('build:html:minify', function() {
  return gulp.src(paths.siteHtmlFilesGlob)
  .pipe(htmlmin({collapseWhitespace: true}))
  .pipe(gulp.dest(paths.siteDir));
});

// Builds styles for local dev.
gulp.task('build:styles', [
  'build:styles:main',
  'build:styles:css'
]);

// Builds styles for production.
gulp.task('build:styles:prod', [
  'build:styles:main:prod',
  'build:styles:css'
]);

gulp.task('clean:styles', function(callback) {
  del([paths.jekyllCssFiles, paths.siteCssFiles, '_includes/critical.css']);
  callback();
});

// Concatenates and uglifies global JS files and outputs result to the
// appropriate location.
gulp.task('build:scripts', function() {
  return gulp.src([
    paths.jsFiles + '/global/lib' + paths.jsPattern,
    paths.jsFiles + '/global/*.js'
  ])
  .pipe(concat('main.js'))
  .pipe(uglify())
  
  // We need to add front matter so Jekyll will process variables.
  .pipe(appendPrepend.prependFile('./_assets/gulp_config/front-matter.txt'))
  
  // Only place in `assets` because Jekyll needs to process the file.
  .pipe(gulp.dest(paths.jekyllJsFiles))
  .pipe(gulp.dest(paths.siteJsFiles))
  .on('error', gutil.log);
});

gulp.task('clean:scripts', function(callback) {
  del([paths.jekyllJsFiles + 'main.js', paths.siteJsFiles + 'main.js']);
  callback();
});

// Optimizes and copies image files.
// We're including imagemin options because we're overriding the default
// JPEG optimization plugin.
gulp.task('build:images', function() {
  return gulp.src(paths.imageFilesGlob)
  .pipe(imagemin([
    imagemin.gifsicle(),
    jpegRecompress(),
    imagemin.optipng()
  ]))
  .pipe(gulp.dest(paths.jekyllImageFiles))
  .pipe(gulp.dest(paths.siteImageFiles))
  .pipe(browserSync.stream());
});

gulp.task('clean:images', function(callback) {
  del([paths.jekyllImageFiles, paths.siteImageFiles]);
  callback();
});

// Copies fonts.
gulp.task('build:fonts', ['fonts']);

// Places Font Awesome fonts in proper location.
gulp.task('fonts', function() {
  return gulp.src(paths.fontFiles + '/**.*')
  .pipe(rename(function(path) {path.dirname = '';}))
  .pipe(gulp.dest(paths.jekyllFontFiles))
  .pipe(gulp.dest(paths.siteFontFiles))
  .pipe(browserSync.stream())
  .on('error', gutil.log);
});

gulp.task('clean:fonts', function(callback) {
  del([paths.jekyllFontFiles, paths.siteFontFiles]);
  callback();
});

// Runs jekyll build command.
gulp.task('build:jekyll', function() {
  var shellCommand = 'bundle exec jekyll build --config _config.yml';
  
  return gulp.src('')
  .pipe(run(shellCommand))
  .on('error', gutil.log);
});

// Runs jekyll build command using test config.
gulp.task('build:jekyll:test', function() {
  var shellCommand = 'bundle exec jekyll build --future --config _config.yml,_config.test.yml';
  
  return gulp.src('')
  .pipe(run(shellCommand))
  .on('error', gutil.log);
});

// Runs jekyll build command using local config.
gulp.task('build:jekyll:local', function() {
  var shellCommand = 'bundle exec jekyll build --future --config _config.yml,_config.test.yml,_config.dev.yml';
  
  return gulp.src('')
  .pipe(run(shellCommand))
  .on('error', gutil.log);
});

// Deletes the entire _site directory.
gulp.task('clean:jekyll', function(callback) {
  del(['_site']);
  callback();
});

gulp.task('clean', ['clean:jekyll',
'clean:fonts',
'clean:images',
'clean:scripts',
'clean:styles']);

// Builds site anew.
gulp.task('build', function(callback) {
  runSequence('clean',
  ['build:scripts', 'build:images', 'build:styles', 'build:fonts'],
  'build:jekyll',
  callback);
});

// Used by prod task immediately below. 
// Builds site anew and gets it into _site folder
// so that final tasks of uncssing, inlining of critical CSS,
// and minification of HTML can be completed on prod files.
gulp.task('build:prod', function(callback) {
  runSequence('clean',
  ['build:scripts', 'build:images', 'build:styles:prod', 'build:fonts'],
  'build:jekyll',
  callback);
});

// Removes unused CSS rules with uncss, inlines above the fold CSS,
// and minifies HTML for production site.
gulp.task('prod', function(callback) {
  runSequence('build:prod', 'build:styles:uncss', 'build:styles:critical', 'build:html:minify')
})

// Builds site anew using test config.
gulp.task('build:test', function(callback) {
  runSequence('clean',
  ['build:scripts', 'build:images', 'build:styles', 'build:fonts'],
  'build:jekyll:test',
  callback);
});

// Builds site anew using local config.
gulp.task('build:local', function(callback) {
  runSequence('clean',
  ['build:scripts', 'build:images', 'build:styles', 'build:fonts'],
  'build:jekyll:local',
  callback);
});

// Default Task: builds site.
gulp.task('default', ['build']);

// Special tasks for building and then reloading BrowserSync.
gulp.task('build:jekyll:watch', ['build:jekyll:local'], function(callback) {
  browserSync.reload();
  callback();
});

gulp.task('build:scripts:watch', ['build:scripts'], function(callback) {
  runSequence('build:jekyll:local');
  browserSync.reload();
  callback();
});

// Static Server + watching files.
// Note: passing anything besides hard-coded literal paths with globs doesn't
// seem to work with gulp.watch().
gulp.task('serve', ['build:local'], function() {
  
  browserSync.init({
    server: paths.siteDir,
    ghostMode: false, // Toggle to mirror clicks, reloads etc. (performance)
    logFileChanges: true,
    logLevel: 'debug',
    open: true        // Toggle to automatically open page when starting.
  });
  
  // Watch site settings.
  gulp.watch(['_config*.yml'], ['build:jekyll:watch']);
  
  // Watch .scss files; changes are piped to browserSync.
  gulp.watch('_assets/styles/**/*.scss', ['build:styles']);
  
  // Watch .js files.
  gulp.watch('_assets/js/**/*.js', ['build:scripts:watch']);
  
  // Watch image files; changes are piped to browserSync.
  gulp.watch('_assets/img/**/*', ['build:images']);
  
  // Watch posts.
  gulp.watch('_posts/**/*.+(md|markdown|MD)', ['build:jekyll:watch']);
  
  // Watch drafts if --drafts flag was passed.
  if (module.exports.drafts) {
    gulp.watch('_drafts/*.+(md|markdown|MD)', ['build:jekyll:watch']);
  }
  
  // Watch html and markdown files.
  gulp.watch(['**/*.+(html|md|markdown|MD)', '!_site/**/*.*'], ['build:jekyll:watch']);
  
  // Watch RSS feed XML files.
  gulp.watch('**.xml', ['build:jekyll:watch']);
  
  // Watch data files.
  gulp.watch('_data/**.*+(yml|yaml|csv|json)', ['build:jekyll:watch']);
  
  // Watch favicon.png.
  gulp.watch('favicon.png', ['build:jekyll:watch']);
});

// Updates Ruby gems
gulp.task('update:bundle', function() {
  return gulp.src('')
  .pipe(run('bundle install'))
  .pipe(run('bundle update'))
  .pipe(notify({ message: 'Bundle Update Complete' }))
  .on('error', gutil.log);
});
