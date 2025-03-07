/**
 *
 * Drop in frontend/src/assets/img/emotes
 *
 */

function getEmoteLinks(selector) {
  const buttonsContainer = document.querySelector(selector);
  const emoteLinks = {};

  buttonsContainer.querySelectorAll('button.emote-picker__emote-link').forEach((button, index) => {
      const name = button.dataset.name;
      const img = button.querySelector('img');
      if (img) {
          const srcset = img.getAttribute('srcset');
          const links = srcset.split(',').map(src => src.trim());
          const fourxLink = links.find(link => link.includes('/3.0'));

          if (fourxLink) {
              const cleanLink = fourxLink.split(' ')[0].replace(/^\/\//, 'https://');
              emoteLinks[name] = cleanLink;

              setTimeout(() => {
                  fetch(cleanLink)
                      .then(response => response.blob())
                      .then(blob => {
                          const link = document.createElement('a');
                          link.href = URL.createObjectURL(blob);
                          link.download = `${name}.gif`;
                          link.click();
                      });
              }, index * 150);  // ffz rate limit
          }
      }
  });

  return emoteLinks;
}
// ffz emote picker emotes parent
const links = getEmoteLinks("#live-page-chat > div > div > div.Layout-sc-1xcs6mc-0.iTiPMO.chat-shell.chat-shell__expanded > div > div > section > div > div.Layout-sc-1xcs6mc-0.kILIqT.chat-input > div:nth-child(2) > div.InjectLayout-sc-1i43xsx-0.blcfev > div.tw-block > div > div > div > div.tw-flex > div > div.simplebar-scroll-content > div > section:nth-child(1) > div");
console.log(links);
