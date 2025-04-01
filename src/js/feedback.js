(function () {
    emailjs.init("poIl8fAAJa9-Xq3D9");
})();

document.getElementById("contactForm").addEventListener("submit", function (e) {
    e.preventDefault();
    
    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const message = document.getElementById("message").value;
    const fullMessage = `Name: ${name}\nEmail: ${email}\n\nMessage: ${message}`;

    emailjs.send("service_n2pg6sa", "template_vslmc1q", {
        name: name,
        email: email,
        message: fullMessage,
    }).then(
        function (response) {
            console.log("Email sent successfully:", response);
            alert("Message sent successfully!");
            document.getElementById("contactForm").reset();
        },
        function (error) {
            console.error("Email send failed:", error);
            alert("Failed to send the message. Please try again later.");
        }
    );
});

function goBack() {
    window.location.href = '../../index.html';
}
