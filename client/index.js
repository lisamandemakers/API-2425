import './index.css';

console.log('Hello, world!');

// 🩷 FAVORIETEN KNOP LIKED
document.addEventListener('DOMContentLoaded', function() {
  const btns = document.querySelectorAll('.favorite-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('liked');
    });
  });
});

// ✨ VIBRATION API
document.addEventListener('DOMContentLoaded', () => {
  const forms = document.querySelectorAll('.favorite-form');

  forms.forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const actionUrl = form.getAttribute('action');
      const formData = new FormData(form);

      try {
        await fetch(actionUrl, {
          method: 'POST',
          body: new URLSearchParams(formData),
        });

        // Voeg 'liked' klasse toe aan de knop
        const submitButton = form.querySelector('.favorite-btn');
        if (submitButton) {
          submitButton.classList.add('liked');
        }

        // Vibratie toevoegen (indien ondersteund)
        if (navigator.vibrate) {
          navigator.vibrate(100); // 100ms trilling
        }

      } catch (err) {
        console.error("Fout bij toevoegen aan favorieten:", err);
        alert("Er ging iets mis...");
      }
    });
  });
});




// 🔊 WEB SPEECH API
// 🔊 SPEECH API
// 🔊 SPEECH API
document.addEventListener('DOMContentLoaded', () => {
  const speakBtn = document.querySelector('#speakButton');
  const descriptionEl = document.querySelector('.book-description');
  const synth = window.speechSynthesis;

  let isSpeaking = false;

  if (speakBtn && descriptionEl) {
    speakBtn.addEventListener('click', () => {
      if (isSpeaking) {
        // Stop het voorlezen
        synth.cancel();
        speakBtn.textContent = 'Read Aloud';
        isSpeaking = false;
      } else {
        const text = descriptionEl.textContent;

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';  // Engels (VS) als taal

        // Als het klaar is met voorlezen: knoptekst resetten
        utterance.onend = () => {
          speakBtn.textContent = '🔊 Read Aloud';
          isSpeaking = false;
        };

        // Start voorlezen
        synth.speak(utterance);
        speakBtn.textContent = 'Stop Reading';
        isSpeaking = true;
      }
    });
  }
});