// Dữ liệu tĩnh lô DCB05 (đã chốt vào file — nguồn gen gốc không còn).
// Dữ liệu thật lô DCB05 (số thửa 57-58-09-10-11): 31 ô, 3.812 m².
//   7 ô có sổ · 5 ô chưa sổ · 19 ô chưa bán.
// File này chỉ chứa DỮ LIỆU NGHIỆP VỤ theo ô; hình học (grid) dựng ở cells.js.
export const DCB05_RAW = [
  {
    "o": 1,
    "cellCode": "DCB05-1",
    "area": 112.0,
    "business": "sold_no_book",
    "contractCode": "22/15",
    "signDate": "2015-10-14",
    "customer": "Nguyễn Thị Tớnh",
    "address": "Tõn Dõn, CL, HD",
    "totalValue": 1026178010.4712,
    "payments": [
      {
        "date": "2021-12-31",
        "amount": 803076443.25,
        "note": "Thanh toán đến 2021"
      }
    ],
    "remaining": 223101567.221204,
    "taxBearer": "Bên A",
    "payment": "partial"
  },
  {
    "o": 2,
    "cellCode": "DCB05-2",
    "area": 100.0,
    "business": "unsold"
  },
  {
    "o": 3,
    "cellCode": "DCB05-3",
    "area": 100.0,
    "business": "sold_red_book",
    "contractCode": "150/10",
    "signDate": "2010-06-13",
    "customer": "Vũ Đình Lụa",
    "address": "Sao Đỏ, CL, HD",
    "totalValue": 1450000000.0,
    "payments": [
      {
        "date": "2021-12-31",
        "amount": 1450000000.0,
        "note": "Thanh toán đến 2021"
      }
    ],
    "remaining": 0.0,
    "taxBearer": null,
    "payment": "paid_full"
  },
  {
    "o": 4,
    "cellCode": "DCB05-4",
    "area": 100.0,
    "business": "sold_red_book",
    "contractCode": "150/10",
    "signDate": "2010-06-13",
    "customer": "Vũ Đình Lụa",
    "address": "Sao Đỏ, CL, HD",
    "totalValue": 1450000000.0,
    "payments": [
      {
        "date": "2021-12-31",
        "amount": 1450000000.0,
        "note": "Thanh toán đến 2021"
      }
    ],
    "remaining": 0.0,
    "taxBearer": null,
    "payment": "paid_full"
  },
  {
    "o": 5,
    "cellCode": "DCB05-5",
    "area": 140.0,
    "business": "sold_red_book",
    "contractCode": "6/10",
    "signDate": "2010-01-29",
    "customer": "Đặng Trớ Trường",
    "address": "Sao Đỏ, CL, HD",
    "totalValue": 1050000000.0,
    "payments": [
      {
        "date": "2021-12-31",
        "amount": 1050000000.0,
        "note": "Thanh toán đến 2021"
      }
    ],
    "remaining": 0.0,
    "taxBearer": null,
    "payment": "paid_full"
  },
  {
    "o": 6,
    "cellCode": "DCB05-6",
    "area": 140.0,
    "business": "sold_red_book",
    "contractCode": "2/10",
    "signDate": "2010-01-16",
    "customer": "Nguyễn Văn Sơn",
    "address": "Sao Đỏ, CL, HD",
    "totalValue": 1050000000.0,
    "payments": [
      {
        "date": "2021-12-31",
        "amount": 1050000000.0,
        "note": "Thanh toán đến 2021"
      }
    ],
    "remaining": 0.0,
    "taxBearer": null,
    "payment": "paid_full"
  },
  {
    "o": 7,
    "cellCode": "DCB05-7",
    "area": 112.0,
    "business": "sold_red_book",
    "contractCode": "70/09",
    "signDate": "2009-10-06",
    "customer": "Nguyễn Văn Hiền",
    "address": "Phả Lại, CL, HD",
    "totalValue": 890000000.0,
    "payments": [
      {
        "date": "2021-12-31",
        "amount": 890000000.0,
        "note": "Thanh toán đến 2021"
      }
    ],
    "remaining": 0.0,
    "taxBearer": null,
    "payment": "paid_full"
  },
  {
    "o": 8,
    "cellCode": "DCB05-8",
    "area": 102.5,
    "business": "unsold"
  },
  {
    "o": 9,
    "cellCode": "DCB05-9",
    "area": 102.5,
    "business": "unsold"
  },
  {
    "o": 10,
    "cellCode": "DCB05-10",
    "area": 102.5,
    "business": "unsold"
  },
  {
    "o": 11,
    "cellCode": "DCB05-11",
    "area": 102.5,
    "business": "unsold"
  },
  {
    "o": 12,
    "cellCode": "DCB05-12",
    "area": 102.5,
    "business": "sold_red_book",
    "contractCode": "33/11",
    "signDate": "2011-09-11",
    "customer": "Lê Đức Hải",
    "address": "Bến tắm, CL-HD",
    "totalValue": 1127500000.0,
    "payments": [
      {
        "date": "2021-12-31",
        "amount": 1127500000.0,
        "note": "Thanh toán đến 2021"
      }
    ],
    "remaining": 0.0,
    "taxBearer": null,
    "payment": "paid_full"
  },
  {
    "o": 13,
    "cellCode": "DCB05-13",
    "area": 102.5,
    "business": "sold_red_book",
    "contractCode": "33/11",
    "signDate": "2011-09-11",
    "customer": "Lê Đức Hải",
    "address": "Bến tắm, CL-HD",
    "totalValue": 1127500000.0,
    "payments": [
      {
        "date": "2021-12-31",
        "amount": 1127500000.0,
        "note": "Thanh toán đến 2021"
      }
    ],
    "remaining": 0.0,
    "taxBearer": null,
    "payment": "paid_full"
  },
  {
    "o": 14,
    "cellCode": "DCB05-14",
    "area": 102.5,
    "business": "unsold"
  },
  {
    "o": 15,
    "cellCode": "DCB05-15",
    "area": 102.5,
    "business": "unsold"
  },
  {
    "o": 16,
    "cellCode": "DCB05-16",
    "area": 156.0,
    "business": "unsold"
  },
  {
    "o": 17,
    "cellCode": "DCB05-17",
    "area": 136.5,
    "business": "unsold"
  },
  {
    "o": 18,
    "cellCode": "DCB05-18",
    "area": 136.5,
    "business": "unsold"
  },
  {
    "o": 19,
    "cellCode": "DCB05-19",
    "area": 136.5,
    "business": "unsold"
  },
  {
    "o": 20,
    "cellCode": "DCB05-20",
    "area": 136.5,
    "business": "unsold"
  },
  {
    "o": 21,
    "cellCode": "DCB05-21",
    "area": 136.5,
    "business": "unsold"
  },
  {
    "o": 22,
    "cellCode": "DCB05-22",
    "area": 127.0,
    "business": "unsold"
  },
  {
    "o": 23,
    "cellCode": "DCB05-23",
    "area": 128.25,
    "business": "unsold"
  },
  {
    "o": 24,
    "cellCode": "DCB05-24",
    "area": 128.25,
    "business": "sold_no_book",
    "contractCode": "47/14",
    "signDate": "2014-11-16",
    "customer": "Phạm Thị Xuờ",
    "address": "Cộng Hoà, CL, HD",
    "totalValue": 641250000.0,
    "payments": [
      {
        "date": "2021-12-31",
        "amount": 200000000.0,
        "note": "Thanh toán đến 2021"
      },
      {
        "date": "2022-12-31",
        "amount": 300000000.0,
        "note": "Thanh toán năm 2022"
      }
    ],
    "remaining": 141250000.0,
    "taxBearer": "Bên B",
    "payment": "partial"
  },
  {
    "o": 25,
    "cellCode": "DCB05-25",
    "area": 127.0,
    "business": "sold_no_book",
    "contractCode": "47/14",
    "signDate": "2014-11-16",
    "customer": "Phạm Thị Xuờ",
    "address": "Cộng Hoà, CL, HD",
    "totalValue": 635000000.0,
    "payments": [
      {
        "date": "2021-12-31",
        "amount": 200000000.0,
        "note": "Thanh toán đến 2021"
      },
      {
        "date": "2022-12-31",
        "amount": 300000000.0,
        "note": "Thanh toán năm 2022"
      }
    ],
    "remaining": 135000000.0,
    "taxBearer": "Bên B",
    "payment": "partial"
  },
  {
    "o": 26,
    "cellCode": "DCB05-26",
    "area": 136.5,
    "business": "unsold"
  },
  {
    "o": 27,
    "cellCode": "DCB05-27",
    "area": 136.5,
    "business": "unsold"
  },
  {
    "o": 28,
    "cellCode": "DCB05-28",
    "area": 136.5,
    "business": "unsold"
  },
  {
    "o": 29,
    "cellCode": "DCB05-29",
    "area": 136.5,
    "business": "unsold"
  },
  {
    "o": 30,
    "cellCode": "DCB05-30",
    "area": 136.5,
    "business": "sold_no_book",
    "contractCode": "5/19",
    "signDate": "2019-01-31",
    "customer": "Nguyễn Quy Sơn",
    "address": "Cộng Hoà, CL, HD",
    "totalValue": 1228500000.0,
    "payments": [
      {
        "date": "2021-12-31",
        "amount": 654229600.0,
        "note": "Thanh toán đến 2021"
      }
    ],
    "remaining": 574270400.0,
    "taxBearer": "Bên B",
    "payment": "partial"
  },
  {
    "o": 31,
    "cellCode": "DCB05-31",
    "area": 156.0,
    "business": "sold_no_book",
    "contractCode": "54/10",
    "signDate": "2010-03-31",
    "customer": "Vũ Thị Hạnh",
    "address": "Cộng Hoà, CL, HD",
    "totalValue": 780000000.0,
    "payments": [
      {
        "date": "2021-12-31",
        "amount": 450000000.0,
        "note": "Thanh toán đến 2021"
      }
    ],
    "remaining": 330000000.0,
    "taxBearer": "Bên B",
    "payment": "partial"
  }
];
