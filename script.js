// Get form and result container
const form = document.getElementById('predictionForm');
const result = document.getElementById('result');

form.addEventListener('submit', async (e) => {
    e.preventDefault(); // prevent page reload

    // 1. Show a loading message (Render's free tier can take 30-50s to wake up)
    result.style.display = "block";
    result.style.color = "#555";
    result.textContent = "Connecting to server... Please wait (this may take a minute if the server is starting up).";

    // 2. Collect data from form inputs
    const data = {
        name: document.getElementById('name').value,
        company: document.getElementById('company').value,
        year: parseInt(document.getElementById('year').value),
        kms_driven: parseInt(document.getElementById('kms_driven').value)
    };

    try {
    
        const response = await fetch('https://project-no-1-tsf2.onrender.com/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const json = await response.json();

        if (response.ok) {
            result.style.color = "green";
            // Formatting the number to look like currency (INR)
            const formattedPrice = new Intl.NumberFormat('en-NP', {
                style: 'currency',
                currency: 'INR',
                maximumFractionDigits: 0
            }).format(json.prediction);

            result.textContent = `Estimated Price: ${formattedPrice}`;
        } else {
            result.style.color = "red";
            result.textContent = `Server Error: ${json.error || 'Something went wrong'}`;
        }

    } catch (error) {
        // 5. Handle network errors (e.g., no internet or server down)
        result.style.color = "red";
        result.textContent = `Network Error: Could not connect to the API.`;
        console.error("Fetch error:", error);
    }
});
