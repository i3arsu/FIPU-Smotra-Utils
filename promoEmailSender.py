import smtplib
import csv
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# --- POSTAVKE ---
sender_email = "@gmail.com"
password = ""
subject = "FIPU: Dive into Knowledge – Postani dio FIPU obitelji! 🌊💻"

# --- TEMPLATE MAILA ---
html_body = """
<html>
<body>
    <p>Bok <strong>{ime}</strong>,</p>
    <p>Znamo da si trenutno u moru informacija o maturi i fakultetima, ali dopusti nam da ti na trenutak skrenemo pažnju na jedan poseban "kod" – onaj koji spaja tvoju strast prema tehnologiji s najljepšim zalaskom sunca na Jadranu.</p>
    
    <h3>Zašto odabrati Fakultet informatike u Puli (FIPU)?</h3>
    <p>Naša boja je <strong>plava</strong> – boja inovacije, povjerenja i našeg Jadrana. U Puli ne dobivaš samo diplomu, već ulaziš u zajednicu koja te priprema za poslove budućnosti.</p>
    
    <ul>
        <li><strong>Moderni studijski programi:</strong> AI, razvoj igara, programiranje.</li>
        <li><strong>Pula kao tvoj kampus:</strong> Pauza uz Arenu ili skok do mora.</li>
        <li><strong>Povezanost s industrijom:</strong> Karijera kreće već tijekom studija.</li>
    </ul>

    <p style="color: #0056b3; font-style: italic;"><strong>"Usidri svoje znanje tamo gdje tehnologija susreće more."</strong></p>

    <p>Sve detalje o upisima pronađi na našem webu: <a href="https://fipu.unipu.hr">fipu.unipu.hr</a></p>
    
    <p>Vidimo se u Puli!<br>
    <strong>Tvoj FIPU tim</strong></p>
</body>
</html>
"""

# --- SLANJE ---
try:
    server = smtplib.SMTP('smtp.gmail.com', 587)
    server.starttls()
    server.login(sender_email, password)

    with open('maturanti.csv', mode='r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        for row in reader:
            msg = MIMEMultipart()
            msg['From'] = sender_email
            msg['To'] = row['email']
            msg['Subject'] = subject

            body = html_body.format(ime=row['ime'])
            msg.attach(MIMEText(body, 'html'))

            server.send_message(msg)
            print(f"Mail uspješno poslan za: {row['ime']} ({row['email']})")

    server.quit()
    print("\nSvi mailovi su poslani!")

except Exception as e:
    print(f"Došlo je do pogreške: {e}")