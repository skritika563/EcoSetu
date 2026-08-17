const User = require("../models/User");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Address Controller
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Backs AddressPicker.jsx's "select a saved address / add a new one" step.
 * Addresses are a subdocument array on the owning User (see models/User.js
 * `savedAddresses`) rather than a standalone collection — a small per-user
 * list with no cross-user querying needs doesn't earn its own top-level
 * collection.
 *
 * req.user is already the caller's own document (attachUser middleware), so
 * every operation here is implicitly scoped to "my addresses" — there is no
 * :userId in these routes, which is what makes reading someone else's saved
 * addresses structurally impossible rather than just checked-for.
 */

const serializeAddress = (addr) => ({
  id: addr._id.toString(),
  label: addr.label,
  line: addr.line,
  city: addr.city,
  state: addr.state,
  pincode: addr.pincode,
  landmark: addr.landmark,
  contactPhone: addr.contactPhone,
  isDefault: addr.isDefault,
});

/** GET /api/addresses */
const listAddresses = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Addresses retrieved",
    data: req.user.savedAddresses.map(serializeAddress),
  });
};

/** POST /api/addresses */
const createAddress = async (req, res) => {
  try {
    const { label, line, city, state, pincode, landmark, contactPhone, isDefault } = req.body;

    if (!label?.trim() || !line?.trim() || !city?.trim()) {
      return res.status(400).json({
        success: false,
        message: "label, line and city are required.",
        error: { code: "VALIDATION_ERROR" },
      });
    }

    const user = await User.findById(req.user._id);

    // Only one default address at a time.
    if (isDefault) {
      user.savedAddresses.forEach((a) => {
        a.isDefault = false;
      });
    }

    const isFirst = user.savedAddresses.length === 0;
    user.savedAddresses.push({
      label: label.trim(),
      line: line.trim(),
      city: city.trim(),
      state: state?.trim() || null,
      pincode: pincode?.trim() || null,
      landmark: landmark?.trim() || null,
      contactPhone: contactPhone?.trim() || null,
      isDefault: !!isDefault || isFirst,
    });

    await user.save();
    const created = user.savedAddresses[user.savedAddresses.length - 1];

    return res.status(201).json({
      success: true,
      message: "Address saved",
      data: serializeAddress(created),
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        error: { code: "VALIDATION_ERROR", details: Object.values(error.errors).map((e) => e.message) },
      });
    }
    console.error("Create address error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while saving this address.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/** PATCH /api/addresses/:addressId */
const updateAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const address = user.savedAddresses.id(req.params.addressId);

    if (!address) {
      return res.status(404).json({ success: false, message: "Address not found.", error: { code: "NOT_FOUND" } });
    }

    const { label, line, city, state, pincode, landmark, contactPhone, isDefault } = req.body;
    if (label !== undefined) address.label = label.trim();
    if (line !== undefined) address.line = line.trim();
    if (city !== undefined) address.city = city.trim();
    if (state !== undefined) address.state = state?.trim() || null;
    if (pincode !== undefined) address.pincode = pincode?.trim() || null;
    if (landmark !== undefined) address.landmark = landmark?.trim() || null;
    if (contactPhone !== undefined) address.contactPhone = contactPhone?.trim() || null;
    if (isDefault) {
      user.savedAddresses.forEach((a) => {
        a.isDefault = a._id.equals(address._id);
      });
    }

    await user.save();
    return res.status(200).json({ success: true, message: "Address updated", data: serializeAddress(address) });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        error: { code: "VALIDATION_ERROR", details: Object.values(error.errors).map((e) => e.message) },
      });
    }
    console.error("Update address error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while updating this address.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/** DELETE /api/addresses/:addressId */
const deleteAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const address = user.savedAddresses.id(req.params.addressId);

    if (!address) {
      return res.status(404).json({ success: false, message: "Address not found.", error: { code: "NOT_FOUND" } });
    }

    const wasDefault = address.isDefault;
    address.deleteOne();
    if (wasDefault && user.savedAddresses.length > 0) {
      user.savedAddresses[0].isDefault = true;
    }

    await user.save();
    return res.status(200).json({ success: true, message: "Address deleted", data: null });
  } catch (error) {
    console.error("Delete address error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while deleting this address.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

module.exports = { listAddresses, createAddress, updateAddress, deleteAddress };
