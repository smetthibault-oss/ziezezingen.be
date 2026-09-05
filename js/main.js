document.querySelectorAll('.nav-toggle').forEach((btn) => {
  btn.addEventListener('click', () => {
    const nav = btn.closest('.navbar').querySelector('.nav-links');
    const isOpen = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(isOpen));
  });
});

document.querySelectorAll('.newsletter-form').forEach((form) => {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = form.querySelector('input[type="email"]').value;
    window.location.href = `mailto:info@ziezezingen.be?subject=Nieuwsbrief&body=Schrijf mij in met ${encodeURIComponent(email)}`;
  });
});
