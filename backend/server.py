    doc.update({
        "id": sid,
        "vendor_id": current["id"],
        "rating": 5.0,
        "is_approved": False,
        "is_online": True, # 🔥 NAYA: By default nayi dukaan online dikhegi (jab approve hogi)
    })
    # ... baaki code
    await db.stores.insert_one(dict(doc))
    doc.pop("_id", None)
    return doc


class StoreUpdateIn(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    category_id: Optional[str] = None
    delivery_min: Optional[int] = None
    image: Optional[str] = None


@api.put("/vendor/stores/{store_id}")
async def vendor_update_store(
    store_id: str,
    data: StoreUpdateIn,
    current=Depends(require_roles("vendor"))
):
    update_data = data.dict(exclude_unset=True)

    if "name" in update_data and not str(update_data["name"]).strip():
        raise HTTPException(400, "Store name cannot be empty")

    if "address" in update_data and not str(update_data["address"]).strip():
        raise HTTPException(400, "Store address cannot be empty")

    if not update_data:
        raise HTTPException(400, "No store changes provided")

    result = await db.stores.update_one(
        {"id": store_id, "vendor_id": current["id"]},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(404, "Store not found or not owned by vendor")

    updated = await db.stores.find_one(
        {"id": store_id, "vendor_id": current["id"]},
        {"_id": 0}
    )
    return updated


@api.post("/vendor/stores/{store_id}/online")
async def vendor_store_online(
    store_id: str,
    data: OnlineIn,
    current=Depends(require_roles("vendor"))
):
    # Sirf current vendor ki apni store ka status update hoga.
    result = await db.stores.update_one(
        {"id": store_id, "vendor_id": current["id"]},
        {"$set": {"is_online": data.online}}
    )

    if result.matched_count == 0:
        raise HTTPException(404, "Store not found or not owned by vendor")

    return {"ok": True, "is_online": data.online}

