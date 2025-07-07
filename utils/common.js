export const getCreatedDate = ob => {
    return ob.createdAt || ob.created_at || ob.dataValues.createdAt || ob.dataValues.created_at
}

