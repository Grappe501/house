// Minimal JS: stamp page slug into the Netlify Form and add current date.
(function(){
  const el = document.querySelector('[data-page-slug]');
  const slug = el ? el.getAttribute('data-page-slug') : '';
  const pageField = document.querySelector('input[name="page_slug"]');
  if(pageField && slug) pageField.value = slug;

  const ts = document.querySelector('input[name="submitted_at"]');
  if(ts) ts.value = new Date().toISOString();
})();
