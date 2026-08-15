module.exports = {
  server: { baseDir: "site", serveStaticOptions: { extensions: ["html"] } },
  files: ["site/**/*.html", "site/**/*.css", "site/**/*.js"],
  port: 3000,
  ui: false,
  open: false,
  notify: false,
  ghostMode: { clicks: false, forms: false, scroll: false }
};
