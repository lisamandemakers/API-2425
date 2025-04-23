import './index.css';

console.log('Hello, world!');

// 🩷 FAVORIETEN KNOP LIKED
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
