export async function getOrCreateFolder(accessToken: string, folderName: string): Promise<string> {
  // 1. Search for existing folder with folderName
  const query = encodeURIComponent(`name = '${folderName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&spaces=drive&fields=files(id,name)`;
  
  const searchRes = await fetch(searchUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    }
  });

  if (searchRes.ok) {
    const searchResult = await searchRes.json();
    if (searchResult.files && searchResult.files.length > 0) {
      return searchResult.files[0].id;
    }
  }

  // 2. Folder doesn't exist, create it
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    })
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    console.error('Failed to create folder in Google Drive:', errText);
    throw new Error('Gagal membuat folder di Google Drive');
  }

  const folderData = await createRes.json();
  return folderData.id;
}

export async function uploadFileToDrive(accessToken: string, file: Blob, filename: string, folderId?: string): Promise<string> {
  const metadata: any = {
    name: filename,
    mimeType: file.type || 'application/pdf',
  };

  if (folderId) {
    metadata.parents = [folderId];
  }

  const boundary = '-------314159265358979323846';
  const delimiter = "\r\n--" + boundary + "\r\n";
  const close_delim = "\r\n--" + boundary + "--";

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = async () => {
      try {
        const fileData = reader.result as ArrayBuffer;

        const metadataPart = delimiter +
          'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
          JSON.stringify(metadata);

        const mediaPart = delimiter +
          'Content-Type: ' + (file.type || 'application/pdf') + '\r\n\r\n';

        const bb = new Blob([
          metadataPart,
          mediaPart,
          fileData,
          close_delim
        ], { type: `multipart/related; boundary=${boundary}` });

        const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: bb,
        });

        if (!res.ok) {
          const text = await res.text();
          console.error('Failed to upload to Google Drive:', text);
          return reject(new Error('Upload to Google Drive failed'));
        }

        const data = await res.json();
        resolve(data.id);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
  });
}
