const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());

async function run() {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
    executablePath: process.env.PUPPETEER_EXEC_PATH,
    headless: false,
  });

  const page = await browser.newPage();
  await page.goto("https://patrickhlauke.github.io/recaptcha/", {
    waitUntil: "networkidle0",
  });

  // Solver code
  await page.evaluate(() => {
    function qSelectorAll(selector) {
      return document
        .querySelector('iframe[src*="api2/anchor"]')
        .contentWindow.document.querySelectorAll(selector);
    }

    function qSelector(selector) {
      return document
        .querySelector('iframe[src*="api2/anchor"]')
        .contentWindow.document.querySelector(selector);
    }

    function ifqSelector(selector) {
      return document
        .querySelector('iframe[src*="api2/bframe"]')
        .contentWindow.document.querySelector(selector);
    }

    var solved = false;
    var checkBoxClicked = false;
    var waitingForAudioResponse = false;
    // Node Selectors
    const CHECK_BOX = ".recaptcha-checkbox-border";
    const AUDIO_BUTTON = "#recaptcha-audio-button";
    const PLAY_BUTTON = ".rc-audiochallenge-play-button .rc-button-default";
    const AUDIO_SOURCE = "#audio-source";
    const IMAGE_SELECT = "#rc-imageselect";
    const RESPONSE_FIELD = ".rc-audiochallenge-response-field";
    const AUDIO_ERROR_MESSAGE = ".rc-audiochallenge-error-message";
    const AUDIO_RESPONSE = "#audio-response";
    const RELOAD_BUTTON = "#recaptcha-reload-button";
    const RECAPTCHA_STATUS = "#recaptcha-accessible-status";
    const DOSCAPTCHA = ".rc-doscaptcha-body";
    const VERIFY_BUTTON = "#recaptcha-verify-button";
    const MAX_ATTEMPTS = 5;
    var requestCount = 0;
    var recaptchaLanguage = qSelector("html").getAttribute("lang");
    var audioUrl = "";
    var recaptchaInitialStatus = qSelector(RECAPTCHA_STATUS)
      ? qSelector(RECAPTCHA_STATUS).innerText
      : "";
    var serversList = [
      "https://engageub.pythonanywhere.com",
      "https://engageub1.pythonanywhere.com",
    ];
    var latencyList = Array(serversList.length).fill(10000);

    function isHidden(el) {
      return el.offsetParent === null;
    }

    async function getTextFromAudio(URL) {
      var minLatency = 100000;
      var url = "";

      for (let k = 0; k < latencyList.length; k++) {
        if (latencyList[k] <= minLatency) {
          minLatency = latencyList[k];
          url = serversList[k];
        }
      }

      requestCount = requestCount + 1;
      URL = URL.replace("recaptcha.net", "google.com");
      if (recaptchaLanguage.length < 1) {
        console.log("Recaptcha Language is not recognized");
        recaptchaLanguage = "en-US";
      }
      console.log("Recaptcha Language is " + recaptchaLanguage);

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: "input=" + encodeURIComponent(URL) + "&lang=" + recaptchaLanguage,
        });
        
        if (response.ok) {
          const responseText = await response.text();
          console.log("Response::" + responseText);
          
          if (
            responseText == "0" ||
            responseText.includes("<") ||
            responseText.includes(">") ||
            responseText.length < 2 ||
            responseText.length > 50
          ) {
            console.log("Invalid Response. Retrying..");
          } else if (
            !!ifqSelector(AUDIO_SOURCE) &&
            !!ifqSelector(AUDIO_SOURCE).src &&
            audioUrl == ifqSelector(AUDIO_SOURCE).src &&
            !!ifqSelector(AUDIO_RESPONSE) &&
            !ifqSelector(AUDIO_RESPONSE).value &&
            !!ifqSelector(VERIFY_BUTTON)
          ) {
            ifqSelector(AUDIO_RESPONSE).value = responseText;
            ifqSelector(VERIFY_BUTTON).click();
          } else {
            console.log("Could not locate text input box");
          }
        } else {
          console.log("Error in fetch response");
        }
      } catch (err) {
        console.log(err.message);
        console.log("Exception handling response. Retrying..");
      }
      
      waitingForAudioResponse = false;
    }

    async function pingTest(url) {
      var start = new Date().getTime();
      try {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        });
        
        if (response.ok && response.status === 200) {
          var end = new Date().getTime();
          var milliseconds = end - start;
          console.log(milliseconds);
          for (let i = 0; i < serversList.length; i++) {
            if (url == serversList[i]) {
              latencyList[i] = milliseconds;
            }
          }
        }
      } catch (e) {
        console.log(e);
      }
    }

    if (qSelector(CHECK_BOX)) {
      qSelector(CHECK_BOX).click();
    } else if (window.location.href.includes("bframe")) {
      for (let i = 0; i < serversList.length; i++) {
        pingTest(serversList[i]);
      }
    }

    var startInterval = setInterval(function () {
      try {
        if (
          !checkBoxClicked &&
          !!qSelector(CHECK_BOX) &&
          !isHidden(qSelector(CHECK_BOX))
        ) {
          qSelector(CHECK_BOX).click();
          checkBoxClicked = true;
        }
        if (
          !!qSelector(RECAPTCHA_STATUS) &&
          qSelector(RECAPTCHA_STATUS).innerText != recaptchaInitialStatus
        ) {
          solved = true;
          console.log("SOLVED");
          clearInterval(startInterval);
        }
        if (requestCount > MAX_ATTEMPTS) {
          console.log("Attempted Max Retries. Stopping the solver");
          solved = true;
          clearInterval(startInterval);
        }
        if (!solved) {
          if (
            !!ifqSelector(AUDIO_BUTTON) &&
            !isHidden(ifqSelector(AUDIO_BUTTON)) &&
            !!ifqSelector(IMAGE_SELECT)
          ) {
            ifqSelector(AUDIO_BUTTON).click();
          }
          if (
            (!waitingForAudioResponse &&
              !!ifqSelector(AUDIO_SOURCE) &&
              !!ifqSelector(AUDIO_SOURCE).src &&
              ifqSelector(AUDIO_SOURCE).src.length > 0 &&
              audioUrl == ifqSelector(AUDIO_SOURCE).src &&
              ifqSelector(RELOAD_BUTTON)) ||
            (ifqSelector(AUDIO_ERROR_MESSAGE) &&
              ifqSelector(AUDIO_ERROR_MESSAGE).innerText.length > 0 &&
              ifqSelector(RELOAD_BUTTON) &&
              !ifqSelector(RELOAD_BUTTON).disabled)
          ) {
            ifqSelector(RELOAD_BUTTON).click();
          } else if (
            !waitingForAudioResponse &&
            ifqSelector(RESPONSE_FIELD) &&
            !isHidden(ifqSelector(RESPONSE_FIELD)) &&
            !ifqSelector(AUDIO_RESPONSE).value &&
            ifqSelector(AUDIO_SOURCE) &&
            ifqSelector(AUDIO_SOURCE).src &&
            ifqSelector(AUDIO_SOURCE).src.length > 0 &&
            audioUrl != ifqSelector(AUDIO_SOURCE).src &&
            requestCount <= MAX_ATTEMPTS
          ) {
            waitingForAudioResponse = true;
            audioUrl = ifqSelector(AUDIO_SOURCE).src;
            getTextFromAudio(audioUrl);
          }
        }
        if (
          qSelector(DOSCAPTCHA) &&
          qSelector(DOSCAPTCHA).innerText.length > 0
        ) {
          console.log("Automated Queries Detected");
          clearInterval(startInterval);
        }
      } catch (err) {
        console.log(err.message);
        console.log("An error occurred while solving. Stopping the solver.");
        clearInterval(startInterval);
      }
    }, 10000);
  });

  // Wait for the CAPTCHA to be solved
  await page.waitForFunction(
    () => {
      const recaptchaStatus = document
        .querySelector('iframe[src*="api2/anchor"]')
        .contentWindow.document.querySelector("#recaptcha-accessible-status");
      return (
        recaptchaStatus &&
        recaptchaStatus.innerText.includes("You are verified")
      );
    },
    { timeout: 120000 },
  );

  // Take a screenshot after CAPTCHA is solved
  await page.screenshot({ path: "screenshot.png" });
  console.log("Screenshot taken after CAPTCHA is solved.");

  await browser.close();
}

run();
