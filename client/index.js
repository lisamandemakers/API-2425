// Importeer de bijbehorende CSS-bestanden
import './index.css';

console.log('Hello, world!');

// 🩷 FAVORIETEN KNOP LIKED
// Wanneer de pagina is geladen...
document.addEventListener('DOMContentLoaded', function() {
  // Selecteer alle elementen met de klasse 'favorite-btn'
  const btns = document.querySelectorAll('.favorite-btn');

  // Voeg een click event toe aan elke favorietenknop
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Toggle (aan/uit zetten) van de 'liked'-klasse wanneer erop wordt geklikt
      btn.classList.toggle('liked');
    });
  });
});

// ✨ VIBRATION API
// Nogmaals, wacht tot de hele pagina geladen is
document.addEventListener('DOMContentLoaded', () => {
  // Selecteer alle formulieren met de klasse 'favorite-form'
  const forms = document.querySelectorAll('.favorite-form');

  // Voor elk formulier...
  forms.forEach(form => {
    // Voeg een event listener toe voor wanneer het formulier wordt verzonden
    form.addEventListener('submit', async (e) => {
      e.preventDefault(); // voorkom standaard form-verzending (pagina vernieuwen)

      const actionUrl = form.getAttribute('action'); // Haal de actie-URL op
      const formData = new FormData(form); // Verzamel de formuliergegevens

      try {
        // Verstuur de data via fetch naar de server
        await fetch(actionUrl, {
          method: 'POST',
          body: new URLSearchParams(formData),
        });

        // Voeg de klasse 'liked' toe aan de knop in het formulier
        const submitButton = form.querySelector('.favorite-btn');
        if (submitButton) {
          submitButton.classList.add('liked');
        }

        // Als het apparaat vibratie ondersteunt: laat het kort trillen
        if (navigator.vibrate) {
          navigator.vibrate(100); // trilt 100 milliseconden
        }

      } catch (err) {
        // Als er iets misgaat tijdens het verzenden
        console.error("Fout bij toevoegen aan favorieten:", err);
        alert("Er ging iets mis...");
      }
    });
  });
});


// 🔊 SPEECH API
// Opnieuw: wacht tot de hele pagina geladen is
document.addEventListener('DOMContentLoaded', () => {
  const speakBtn = document.querySelector('#speakButton'); // de knop om voor te lezen
  const descriptionEl = document.querySelector('.book-description'); // de tekst die voorgelezen moet worden
  const synth = window.speechSynthesis; // Web Speech API object

  let isSpeaking = false; // Houdt bij of er op dit moment wordt voorgelezen

  if (speakBtn && descriptionEl) {
    speakBtn.addEventListener('click', () => {
      if (isSpeaking) {
        // Als er al gesproken wordt: stop het
        synth.cancel();
        speakBtn.textContent = 'Read Aloud'; // Zet knoptekst terug
        isSpeaking = false;
      } else {
        // Tekst ophalen om voor te lezen
        const text = descriptionEl.textContent;

        // Maak een "spraakopdracht" aan met de tekst
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';  // Taal instellen op Engels (VS)

        // Als het voorlezen klaar is: zet knoptekst terug
        utterance.onend = () => {
          speakBtn.textContent = '🔊 Read Aloud';
          isSpeaking = false;
        };

        // Start met voorlezen
        synth.speak(utterance);
        speakBtn.textContent = 'Stop Reading'; // Verander knoptekst
        isSpeaking = true;
      }
    });
  }
});
