// 1. Imports, laad externe modules (packages) in.
import 'dotenv/config';
import { App } from '@tinyhttp/app';
import { logger } from '@tinyhttp/logger';
import { Liquid } from 'liquidjs';
import sirv from 'sirv';

// 2. Data-object, dit is nu de content van de website en gaan we later dynamisch maken
const data = {
  'beemdkroon': {
    id: 'beemdkroon',
    name: 'Beemdkroon',
    image: {
      src: 'https://i.pinimg.com/736x/09/0a/9c/090a9c238e1c290bb580a4ebe265134d.jpg',
      alt: 'Beemdkroon',
      width: 695,
      height: 1080,
    }
  },
  'wilde-peen': {
    id: 'wilde-peen',
    name: 'Wilde Peen',
    image: {
      src: 'https://mens-en-gezondheid.infonu.nl/artikel-fotos/tom008/4251914036.jpg',
      alt: 'Wilde Peen',
      width: 418,
      height: 600,
    }
  }
}

// 3. LiquidJS instellen, zorgt ervoor dat alle .liquid bestanden worden verwerkt
const engine = new Liquid({
  extname: '.liquid',
});

// 4. Webserver maken met TinyHTTP
const app = new App();
// 5. Middelware instellen en service starten
// Logger() laat in de terminal zien welke pagina's worden geladen.
app
  .use(logger())
  .use('/', sirv('dist'))
  .listen(3000, () => console.log('Server available on http://localhost:3000'));

// 6. Route voort home pagina
// Render template zorgt ervoor dat de home page word gelinkt met de index.liquid & lijst van bloemen
app.get('/', async (req, res) => {
  return res.send(renderTemplate('server/views/index.liquid', { title: 'Home', items: Object.values(data) }));
});

// 7. Route voor een detailpagina
app.get('/plant/:id/', async (req, res) => {
  const id = req.params.id;
  const item = data[id];
  if (!item) {
    return res.status(404).send('Not found');
  }
  return res.send(renderTemplate('server/views/detail.liquid', { title: `Detail page for ${id}`, item }));
});

// 8. Functie om liquid templates te renderen
// .liquid docs worden gevuld → kijkt of de app in ontwikkelmodus (dev) of live (production) staat
// engine.renderFileSync(template, templateData) → Rendert het opgegeven Liquid-template en vult het met data.
const renderTemplate = (template, data) => {
  const templateData = {
    NODE_ENV: process.env.NODE_ENV || 'production',
    ...data
  };

  return engine.renderFileSync(template, templateData);
};


app.get('/books', async (req, res) => {
  const query = req.query.query || 'flowers';
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&key=${apiKey}`;

  try {
    const response = await fetch(url); // gewoon fetch gebruiken!
    const json = await response.json();
    const books = json.items?.map(item => ({
      title: item.volumeInfo.title,
      authors: item.volumeInfo.authors,
      thumbnail: item.volumeInfo.imageLinks?.thumbnail,
    })) || [];

    return res.send(renderTemplate('server/views/books.liquid', { title: 'Books', books, query }));
  } catch (error) {
    console.error('Error fetching books:', error);
    return res.status(500).send('Failed to fetch books');
  }
});

