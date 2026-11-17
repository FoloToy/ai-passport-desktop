package core

import (
	"errors"
	"os"
	"strings"

	"github.com/FoloToy/ai-passport-desktop/pkg/firmware"
	"github.com/FoloToy/ai-passport-desktop/pkg/syncer"
)

// WirelessPlan is what the Play Installer needs to install a play over Wi-Fi:
// the device downloads URL itself and checks it against Size and SHA256.
type WirelessPlan struct {
	URL       string `json:"url"`
	Size      int64  `json:"size"`
	SHA256    string `json:"sha256"`
	AppOffset int    `json:"appOffset"`
}

// PlanWireless checks a downloaded play for the Play Installer (the same checks the
// installer runs, see firmware.InspectRecovery) and returns where the device should
// download it from. Error codes: not_ready, no_firmware, wireless_app_big,
// wireless_space, wireless_image, checksum.
func (c *Core) PlanWireless(slug string) (WirelessPlan, error) {
	if _, err := c.Play(slug); err != nil {
		return WirelessPlan{}, fail("other", err)
	}
	sha, size, ok := syncer.LocalFirmware(c.Library(), slug)
	if !ok {
		return WirelessPlan{}, fail("not_ready", errors.New("firmware not downloaded"))
	}
	url, err := c.Sync.FirmwareURL(c.Settings.Get().LibraryDir, slug)
	if err != nil {
		if errors.Is(err, syncer.ErrNoFirmware) {
			return WirelessPlan{}, fail("no_firmware", err)
		}
		return WirelessPlan{}, fail("other", err)
	}
	if !strings.HasPrefix(url, "https://") {
		return WirelessPlan{}, fail("wireless_image", errors.New("the firmware URL is not HTTPS"))
	}
	b, err := os.ReadFile(c.Library().FirmwarePath(slug))
	if err != nil {
		return WirelessPlan{}, fail("not_ready", err)
	}
	ins, err := firmware.InspectRecovery(b, sha)
	if err != nil {
		var fe *firmware.FitError
		if errors.As(err, &fe) {
			switch fe.Kind {
			case firmware.FitAppTooBig:
				return WirelessPlan{}, fail("wireless_app_big", err)
			case firmware.FitNoSpace:
				return WirelessPlan{}, fail("wireless_space", err)
			case firmware.FitChecksum:
				return WirelessPlan{}, fail("checksum", err)
			}
		}
		return WirelessPlan{}, fail("wireless_image", err)
	}
	return WirelessPlan{URL: url, Size: size, SHA256: ins.SHA256, AppOffset: ins.AppOffset}, nil
}
