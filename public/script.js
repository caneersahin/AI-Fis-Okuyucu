const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const uploadContent = document.getElementById('uploadContent');
const imagePreview = document.getElementById('imagePreview');
const previewImg = document.getElementById('previewImg');
const removeImgBtn = document.getElementById('removeImgBtn');
const scanBtn = document.getElementById('scanBtn');
const loader = document.getElementById('loader');
const resultSection = document.getElementById('resultSection');

const itemsBody = document.getElementById('itemsBody');
const kdvList = document.getElementById('kdvList');
const totalAmount = document.getElementById('totalAmount');

let currentFile = null;

// Drag and drop olayları
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
        handleFile(e.dataTransfer.files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
        handleFile(e.target.files[0]);
    }
});

function handleFile(file) {
    if (!file.type.startsWith('image/')) {
        alert('Lütfen sadece görsel dosyası yükleyin.');
        return;
    }
    
    currentFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        previewImg.src = e.target.result;
        uploadContent.classList.add('hidden');
        imagePreview.classList.remove('hidden');
        scanBtn.classList.remove('hidden');
        resultSection.classList.add('hidden'); // Yeni dosya eklenince sonucları gizle
    };
    reader.readAsDataURL(file);
}

removeImgBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    currentFile = null;
    fileInput.value = '';
    previewImg.src = '';
    uploadContent.classList.remove('hidden');
    imagePreview.classList.add('hidden');
    scanBtn.classList.add('hidden');
    resultSection.classList.add('hidden');
});

scanBtn.addEventListener('click', async () => {
    if (!currentFile) return;

    scanBtn.classList.add('hidden');
    loader.classList.remove('hidden');
    resultSection.classList.add('hidden');

    const formData = new FormData();
    formData.append('receipt', currentFile);

    try {
        const response = await fetch('/api/parse-receipt', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Sunucu hatası');
        }

        renderResult(data);
    } catch (error) {
        alert(error.message);
        scanBtn.classList.remove('hidden'); // Hata durumunda butonu geri getir
    } finally {
        loader.classList.add('hidden');
    }
});

function renderResult(data) {
    // Ürünleri tabloya dök
    itemsBody.innerHTML = '';
    if (data.items && data.items.length > 0) {
        data.items.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.name}</td>
                <td class="text-right">₺${parseFloat(item.price).toFixed(2)}</td>
            `;
            itemsBody.appendChild(tr);
        });
    } else {
        itemsBody.innerHTML = '<tr><td colspan="2">Ürün bulunamadı.</td></tr>';
    }

    // KDV oranlarını listele
    kdvList.innerHTML = '';
    if (data.kdvGroups && data.kdvGroups.length > 0) {
        data.kdvGroups.forEach(kdv => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>KDV %${kdv.percentage}</span>
                <strong>₺${parseFloat(kdv.amount).toFixed(2)}</strong>
            `;
            kdvList.appendChild(li);
        });
    } else {
        kdvList.innerHTML = '<li>KDV detayı bulunamadı.</li>';
    }

    // Genel Toplam Tutar
    if (data.totalAmount) {
        totalAmount.textContent = `₺${parseFloat(data.totalAmount).toFixed(2)}`;
    } else {
        totalAmount.textContent = '₺0.00';
    }

    resultSection.classList.remove('hidden');
    scanBtn.classList.remove('hidden');
    scanBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Başka Fiş Analiz Et';
}
