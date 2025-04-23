import './index.css';

console.log('Hello, world!');


document.addEventListener('DOMContentLoaded', function() {
  const btns = document.querySelectorAll('.btn');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('liked');
    });
  });
});



document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('.favorite-form');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const actionUrl = form.getAttribute('action');
      const formData = new FormData(form);

      try {
        await fetch(actionUrl, {
          method: 'POST',
          body: new URLSearchParams(formData),
        });

       
      } catch (err) {
        console.error("Fout bij toevoegen aan favorieten:", err);
        alert("Er ging iets mis...");
      }
    });
  }
});
