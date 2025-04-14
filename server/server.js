// 1. Imports, laad externe modules (packages) in.
import 'dotenv/config';
import { App } from '@tinyhttp/app';
import { logger } from '@tinyhttp/logger';
import { Liquid } from 'liquidjs';
import sirv from 'sirv';


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
  .use('/', sirv(process.env.NODE_ENV === 'development' ? 'client' : 'dist'))
  .listen(3000, () => console.log('Server available on http://localhost:3000'));

// 6. Route voort home pagina
// Render template zorgt ervoor dat de home page word gelinkt met de index.liquid & lijst van bloemen
app.get('/', async (req, res) => {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  const query = req.query.query;
  const category = req.query.category;

  // 🔍 Zoekfunctie of categorie-filter
  if (query || category) {
    let searchQuery = query;

    // Als alleen een categorie is gekozen (zonder zoekterm), gebruik die
    if (!query && category) {
      if (category === 'new') searchQuery = 'kristin';
      if (category === 'literature') searchQuery = 'literature';
      if (category === 'bestsellers') searchQuery = 'bestsellers';
    }

    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchQuery)}&key=${apiKey}&maxResults=40`;

    try {
      const response = await fetch(url);
      const json = await response.json();
      const books = (json.items || []).map(item => ({
        title: item.volumeInfo.title,
        authors: item.volumeInfo.authors,
        thumbnail: item.volumeInfo.imageLinks?.thumbnail,
      }));

      return res.send(renderTemplate('server/views/index.liquid', {
        title: 'Zoekresultaten',
        query,
        category,
        searchResults: books,
      }));
    } catch (error) {
      console.error('Error fetching search results:', error);
      return res.status(500).send('Zoeken mislukt');
    }
  }

  // 📚 Standaardcategorieën op homepage
  const categories = {
    newReleases: 'kristin',
    literature: 'literature',
    bestSelling: 'bestsellers',
  };

  try {
    const results = await Promise.all(
      Object.entries(categories).map(async ([key, query]) => {
        const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&key=${apiKey}&maxResults=12`;
        const response = await fetch(url);
        const json = await response.json();

        return [
          key,
          (json.items || []).map(item => ({
            title: item.volumeInfo.title,
            authors: item.volumeInfo.authors,
            thumbnail: item.volumeInfo.imageLinks?.thumbnail,
          })),
        ];
      })
    );

    const data = Object.fromEntries(results);

    return res.send(renderTemplate('server/views/index.liquid', {
      title: 'Home',
      ...data,
    }));
  } catch (error) {
    console.error('Error fetching books:', error);
    return res.status(500).send('Failed to fetch books');
  }
});



app.get('/books', async (req, res) => {
  const query = req.query.query || 'atomic+habits';
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&key=${apiKey}&maxResults=40`;


  try {
    const response = await fetch(url); // gewoon fetch gebruiken!
    const json = await response.json(); // json is een object
    const books = json.items?.map(item => ({  //  json.items zijn alle gevonden boeken, map() laat alleen de stukjes zien die we willen zien (volgende regels)
      title: item.volumeInfo.title,
      authors: item.volumeInfo.authors,
      thumbnail: item.volumeInfo.imageLinks?.thumbnail,
      rating: item.volumeInfo.averageRating || 'Geen rating',
    })) || [];

    return res.send(renderTemplate('server/views/books.liquid', { title: 'Books', books, query }));
  } catch (error) {
    console.error('Error fetching books:', error);
    return res.status(500).send('Failed to fetch books');
  }
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


