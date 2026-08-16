module.exports = {
  server: { baseDir: "backend-supabase/public", serveStaticOptions: { extensions: ["html"] } },
  files: ["backend-supabase/public/**/*.html", "backend-supabase/public/**/*.css", "backend-supabase/public/**/*.js"],
  port: 3001,
  ui: false,
  open: false,
  notify: false,
  ghostMode: { clicks: false, forms: false, scroll: false }
};
