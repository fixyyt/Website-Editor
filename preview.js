document.addEventListener('DOMContentLoaded', () => {
    const previewFrame = document.getElementById('preview-frame');
    const fullscreenButton = document.createElement('button');
    fullscreenButton.textContent = 'Fullscreen';
    fullscreenButton.classList.add('fullscreen-button');
    document.querySelector('.preview').appendChild(fullscreenButton);

    fullscreenButton.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            previewFrame.requestFullscreen().catch(err => {
                alert(`Error attempting to enable full-screen mode: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    });

    document.addEventListener('fullscreenchange', () => {
        if (document.fullscreenElement) {
            fullscreenButton.textContent = 'Close Fullscreen';
        } else {
            fullscreenButton.textContent = 'Fullscreen';
        }
    });

    document.addEventListener('keyup', (event) => {
        if (event.key === 'Escape' && document.fullscreenElement) {
            document.exitFullscreen();
        }
    });
});
/*
 _______  __  ___   ___ ____    ____ 
|   ____||  | \  \ /  / \   \  /   / 
|  |__   |  |  \  V  /   \   \/   /  
|   __|  |  |   >   <     \_    _/   
|  |     |  |  /  .  \      |  |     
|__|     |__| /__/ \__\     |__|     
                                     
*/