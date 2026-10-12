// Shop catalog (mirrors backend/server/catalog.js). price: null = "Price not specified" (cannot be ordered).
window.CATEGORIES = [
  {
    "id": "claycrafts",
    "name": "Clay Crafts",
    "variations": [
      "HarmonySeries",
      "MatchaSeries"
    ]
  },
  {
    "id": "crochet",
    "name": "Crochet",
    "variations": [
      "FishPouches",
      "Milkshake",
      "SprinkleCookie"
    ]
  },
  {
    "id": "felt",
    "name": "Felt",
    "variations": [
      "Brooches",
      "Pocaholders"
    ]
  },
  {
    "id": "keychain",
    "name": "Keychains",
    "variations": [
      "Chiikawa",
      "DreamBear",
      "Macaroon",
      "Puppies",
      "SVT",
      "Tamagotchi"
    ]
  }
];

window.CATALOG = [
  {"id": "claycrafts-bear", "name": "Bear", "cat": "claycrafts", "sub": null, "price": 140, "img": "images/Bear₱140.png"},
  {"id": "claycrafts-pudding", "name": "Pudding", "cat": "claycrafts", "sub": null, "price": 130, "img": "images/Pudding₱130.png"},
  {"id": "claycrafts-harmonyseries-blue", "name": "Blue", "cat": "claycrafts", "sub": "HarmonySeries", "price": 160, "img": "images/Blue₱160.png"},
  {"id": "claycrafts-harmonyseries-green", "name": "Green", "cat": "claycrafts", "sub": "HarmonySeries", "price": 160, "img": "images/Green₱160.png"},
  {"id": "claycrafts-harmonyseries-pink", "name": "Pink", "cat": "claycrafts", "sub": "HarmonySeries", "price": 160, "img": "images/Pink₱160.png"},
  {"id": "claycrafts-harmonyseries-img-6777-png", "name": "IMG_6777.PNG", "cat": "claycrafts", "sub": "HarmonySeries", "price": null, "img": "images/IMG_6777.PNG"},
  {"id": "claycrafts-matchaseries-matchaberrie", "name": "MatchaBerrie", "cat": "claycrafts", "sub": "MatchaSeries", "price": 230, "img": "images/MatchaBerrie₱230.png"},
  {"id": "claycrafts-matchaseries-matchabunny", "name": "MatchaBunny", "cat": "claycrafts", "sub": "MatchaSeries", "price": 230, "img": "images/MatchaBunny₱230.png"},
  {"id": "crochet-bearphotoholder", "name": "BearPhotoHolder", "cat": "crochet", "sub": null, "price": 140, "img": "images/BearPhotoHolder₱140.png"},
  {"id": "crochet-catphotoholder", "name": "CatPhotoHolder", "cat": "crochet", "sub": null, "price": 140, "img": "images/CatPhotoHolder₱140.png"},
  {"id": "crochet-fruitphotoholder", "name": "FruitPhotoHolder", "cat": "crochet", "sub": null, "price": 140, "img": "images/FruitPhotoHolder₱140.png"},
  {"id": "crochet-puddingphotoholder", "name": "PuddingPhotoHolder", "cat": "crochet", "sub": null, "price": 150, "img": "images/PuddingPhotoHolder₱150.png"},
  {"id": "crochet-fishpouches-oceanseriespouches", "name": "OceanSeriesPouches", "cat": "crochet", "sub": "FishPouches", "price": null, "img": "images/OceanSeriesPouches.png"},
  {"id": "crochet-fishpouches-orangepuff", "name": "OrangePuff", "cat": "crochet", "sub": "FishPouches", "price": 170, "img": "images/OrangePuff₱170.png"},
  {"id": "crochet-fishpouches-yellowpouch", "name": "YellowPouch", "cat": "crochet", "sub": "FishPouches", "price": 170, "img": "images/YellowPouch₱170.png"},
  {"id": "crochet-fishpouches-yellowpuffpouch", "name": "YellowPuffPouch", "cat": "crochet", "sub": "FishPouches", "price": 170, "img": "images/YellowPuffPouch₱170.png"},
  {"id": "crochet-milkshake-bluemilkshake", "name": "BlueMilkshake", "cat": "crochet", "sub": "Milkshake", "price": 90, "img": "images/BlueMilkshake₱90.png"},
  {"id": "crochet-milkshake-pinkmilkshake", "name": "PinkMilkshake", "cat": "crochet", "sub": "Milkshake", "price": 90, "img": "images/PinkMilkshake₱90.png"},
  {"id": "crochet-milkshake-yellowmilkshake", "name": "YellowMilkshake", "cat": "crochet", "sub": "Milkshake", "price": 90, "img": "images/YellowMilkshake₱90.png"},
  {"id": "crochet-milkshake-milkshake-png", "name": "Milkshake.png", "cat": "crochet", "sub": "Milkshake", "price": null, "img": "images/Milkshake.png"},
  {"id": "crochet-sprinklecookie-pinkcookie", "name": "PinkCookie", "cat": "crochet", "sub": "SprinkleCookie", "price": 150, "img": "images/PinkCookie₱150.png"},
  {"id": "crochet-sprinklecookie-whitecookie", "name": "WhiteCookie", "cat": "crochet", "sub": "SprinkleCookie", "price": 150, "img": "images/WhiteCookie₱150.png"},
  {"id": "crochet-sprinklecookie-mirrorsprinklecookie", "name": "MirrorSprinkleCookie", "cat": "crochet", "sub": "SprinkleCookie", "price": null, "img": "images/MirrorSprinkleCookie.png"},
  {"id": "felt-apple", "name": "Apple", "cat": "felt", "sub": null, "price": 110, "img": "images/Apple₱110.png"},
  {"id": "felt-clover", "name": "Clover", "cat": "felt", "sub": null, "price": 110, "img": "images/Clover₱110.png"},
  {"id": "felt-narutomaki", "name": "Narutomaki", "cat": "felt", "sub": null, "price": 110, "img": "images/Narutomaki₱110.png"},
  {"id": "felt-nct", "name": "NCT", "cat": "felt", "sub": null, "price": 120, "img": "images/NCT₱120.png"},
  {"id": "felt-svrcardwallet", "name": "SVRCardWallet", "cat": "felt", "sub": null, "price": 200, "img": "images/SVRCardWallet₱200.png"},
  {"id": "felt-tomato", "name": "Tomato", "cat": "felt", "sub": null, "price": 110, "img": "images/Tomato₱110.png"},
  {"id": "felt-txt", "name": "TxT", "cat": "felt", "sub": null, "price": 100, "img": "images/TXT₱100.png"},
  {"id": "felt-whimsycalwallet", "name": "WhimsycalWallet", "cat": "felt", "sub": null, "price": 200, "img": "images/WhimsycalWallet₱200.png"},
  {"id": "felt-brooches-hellokitty", "name": "HelloKitty", "cat": "felt", "sub": "Brooches", "price": 90, "img": "images/HelloKitty₱90.png"},
  {"id": "felt-brooches-monkey", "name": "Monkey", "cat": "felt", "sub": "Brooches", "price": 90, "img": "images/Monkey₱90.png"},
  {"id": "felt-brooches-pochacover-1", "name": "PochacoVer.1", "cat": "felt", "sub": "Brooches", "price": 90, "img": "images/PochacoVer.1₱90.png"},
  {"id": "felt-brooches-pochacover-2", "name": "PochacoVer.2", "cat": "felt", "sub": "Brooches", "price": 90, "img": "images/PochacoVer.2₱90.png"},
  {"id": "felt-brooches-pompompurin", "name": "Pompompurin", "cat": "felt", "sub": "Brooches", "price": 90, "img": "images/Pompompurin₱90.png"},
  {"id": "felt-pocaholders-fallver-1", "name": "FallVer.1", "cat": "felt", "sub": "Pocaholders", "price": 120, "img": "images/FallVer.1₱120.png"},
  {"id": "felt-pocaholders-fallver-2", "name": "FallVer.2", "cat": "felt", "sub": "Pocaholders", "price": 120, "img": "images/FallVer.2₱120.png"},
  {"id": "felt-pocaholders-untitledtts-20261012115722-png", "name": "Untitledtts_20261012115722.png", "cat": "felt", "sub": "Pocaholders", "price": null, "img": "images/Untitled115_20261012115722.png"},
  {"id": "keychain-cat", "name": "Cat", "cat": "keychain", "sub": null, "price": 100, "img": "images/Cat₱100.png"},
  {"id": "keychain-clover", "name": "Clover", "cat": "keychain", "sub": null, "price": 100, "img": "images/Clover₱100.png"},
  {"id": "keychain-icecream", "name": "Icecream", "cat": "keychain", "sub": null, "price": 130, "img": "images/Icecream₱130.png"},
  {"id": "keychain-matcha", "name": "Matcha", "cat": "keychain", "sub": null, "price": 120, "img": "images/Matcha₱120.png"},
  {"id": "keychain-moppu", "name": "Moppu", "cat": "keychain", "sub": null, "price": 100, "img": "images/Moppu₱100.png"},
  {"id": "keychain-nana", "name": "Nana", "cat": "keychain", "sub": null, "price": 100, "img": "images/Nana₱100.png"},
  {"id": "keychain-pinkcat", "name": "PinkCat", "cat": "keychain", "sub": null, "price": 100, "img": "images/PinkCat₱100.png"},
  {"id": "keychain-ssl", "name": "SSL", "cat": "keychain", "sub": null, "price": 100, "img": "images/S&L₱100.png"},
  {"id": "keychain-smiski", "name": "Smiski", "cat": "keychain", "sub": null, "price": 200, "img": "images/Smiski₱200.png"},
  {"id": "keychain-wafflebear", "name": "WaffleBear", "cat": "keychain", "sub": null, "price": 90, "img": "images/WaffleBear₱90.png"},
  {"id": "keychain-chiikawa-chiikawa", "name": "Chiikawa", "cat": "keychain", "sub": "Chiikawa", "price": 160, "img": "images/Chiikawa₱160.png"},
  {"id": "keychain-chiikawa-hachiware", "name": "Hachiware", "cat": "keychain", "sub": "Chiikawa", "price": 160, "img": "images/Hachiware₱160.png"},
  {"id": "keychain-chiikawa-momonga", "name": "Momonga", "cat": "keychain", "sub": "Chiikawa", "price": 160, "img": "images/Momonga₱160.png"},
  {"id": "keychain-chiikawa-rakko", "name": "Rakko", "cat": "keychain", "sub": "Chiikawa", "price": 160, "img": "images/Rakko₱160.png"},
  {"id": "keychain-chiikawa-usagi", "name": "Usagi", "cat": "keychain", "sub": "Chiikawa", "price": 160, "img": "images/Usagi₱160.png"},
  {"id": "keychain-dreambear-creambear", "name": "CreamBear", "cat": "keychain", "sub": "DreamBear", "price": 90, "img": "images/CreamBear₱90.png"},
  {"id": "keychain-dreambear-pinkbear", "name": "PinkBear", "cat": "keychain", "sub": "DreamBear", "price": 90, "img": "images/PinkBear₱90.png"},
  {"id": "keychain-dreambear-whitebear", "name": "WhiteBear", "cat": "keychain", "sub": "DreamBear", "price": 90, "img": "images/WhiteBear₱90.png"},
  {"id": "keychain-dreambear-dreambears-png", "name": "DreamBears.png", "cat": "keychain", "sub": "DreamBear", "price": null, "img": "images/DreamBears.png"},
  {"id": "keychain-macaroon-bluebunny", "name": "BlueBunny", "cat": "keychain", "sub": "Macaroon", "price": 110, "img": "images/BlueBunny₱110.png"},
  {"id": "keychain-macaroon-pinkbunny", "name": "PinkBunny", "cat": "keychain", "sub": "Macaroon", "price": 110, "img": "images/PinkBunny₱110.png"},
  {"id": "keychain-macaroon-macaroons-png", "name": "Macaroons.png", "cat": "keychain", "sub": "Macaroon", "price": null, "img": "images/Macaroons.png"},
  {"id": "keychain-puppies-orangepup", "name": "OrangePup", "cat": "keychain", "sub": "Puppies", "price": 100, "img": "images/OrangePup₱100.png"},
  {"id": "keychain-puppies-pinkpup", "name": "PinkPup", "cat": "keychain", "sub": "Puppies", "price": 100, "img": "images/PinkPup₱100.png"},
  {"id": "keychain-puppies-purplepup", "name": "PurplePup", "cat": "keychain", "sub": "Puppies", "price": 100, "img": "images/PurplePup₱100.png"},
  {"id": "keychain-puppies-puppies-png", "name": "Puppies.png", "cat": "keychain", "sub": "Puppies", "price": null, "img": "images/Puppies.png"},
  {"id": "keychain-svt-0p-1", "name": "0p.1", "cat": "keychain", "sub": "SVT", "price": 90, "img": "images/Op.1₱90.png"},
  {"id": "keychain-svt-0p-2", "name": "0p.2", "cat": "keychain", "sub": "SVT", "price": 90, "img": "images/Op.2₱90.png"},
  {"id": "keychain-svt-0p-3", "name": "0p.3", "cat": "keychain", "sub": "SVT", "price": 90, "img": "images/Op.3₱90.png"},
  {"id": "keychain-svt-svtattacca-png", "name": "svtattacca.png", "cat": "keychain", "sub": "SVT", "price": null, "img": "images/SVTAttacca.png"},
  {"id": "keychain-tamagotchi-blacktamago", "name": "BlackTamago", "cat": "keychain", "sub": "Tamagotchi", "price": 120, "img": "images/BlackTamago₱120.png"},
  {"id": "keychain-tamagotchi-pinktamago", "name": "PinkTamago", "cat": "keychain", "sub": "Tamagotchi", "price": 120, "img": "images/PinkTamago₱120.png"},
  {"id": "keychain-tamagotchi-tamagotchi-png", "name": "Tamagotchi.png", "cat": "keychain", "sub": "Tamagotchi", "price": null, "img": "images/Tamagotchi.png"}
];

window.IMG_PLACEHOLDER = "Image coming soon";

window.peso = n => n == null ? "Price not specified" : "\u20b1" + Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// <img> for a product; falls back to a dashed placeholder box if the file is missing
window.imgHTML = (p, tiny) => {
  const cls = tiny ? " tiny" : "";
  const ph = `<div class="img-ph${cls}">${tiny ? "" : window.IMG_PLACEHOLDER}</div>`;
  if (!p || !p.img) return ph;
  const alt = String(p.name).replace(/"/g, "&quot;");
  return `<img class="p-img${cls}" src="${encodeURI(p.img)}" alt="${alt}" loading="lazy" onerror="this.outerHTML=this.dataset.ph" data-ph="${ph.replace(/"/g, "&quot;")}">`;
};
