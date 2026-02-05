const fetch = require('node-fetch');

async function testAPI() {
  try {
    const response = await fetch('http://localhost:3001/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        system: `Je schrijft exact één post per dag.
Je bent geen marketeer, coach of copywriter.
Je stelt geen vragen.
Je toont geen denkstappen.
Geen emoji. Geen hashtags. Geen call-to-action.`,
        user: `Rol: expert
Platform: LinkedIn
Doelgroep: professionals
Intentie: inform
Waarom nu: current trends
Keywords: AI, tech`
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Success:', data);
    } else {
      console.log('Failed with status:', response.status);
      const text = await response.text();
      console.log('Response:', text);
    }
  } catch (error) {
    console.log('Error:', error.message);
  }
}

testAPI();