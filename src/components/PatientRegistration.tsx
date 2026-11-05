import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ChevronRight,
  CheckCircle2,
  UserPlus,
  Printer,
  FileText,
  Loader2,
  Edit3,
  Save,
  Camera,
  UploadCloud,
  Phone,
  Target,
  ShieldCheck,
  Users,
  Search,
  Baby,
} from "lucide-react";
import { patientService } from "../services/patient.service";
import { useNotification } from "../context/NotificationContext";

// Import the custom components
import SignaturePad from "./SignaturePad";
import SearchableSelect from "./SearchableSelect";


const countries = [
  { name: "Nigeria", code: "NG", flag: "🇳🇬" },
  { name: "Ghana", code: "GH", flag: "🇬🇭" },
  { name: "Cameroon", code: "CM", flag: "🇨🇲" },
  { name: "Kenya", code: "KE", flag: "🇰🇪" },
  { name: "South Africa", code: "ZA", flag: "🇿🇦" },
  { name: "Uganda", code: "UG", flag: "🇺🇬" },
  { name: "Tanzania", code: "TZ", flag: "🇹🇿" },
  { name: "Rwanda", code: "RW", flag: "🇷🇼" },
  { name: "Ethiopia", code: "ET", flag: "🇪🇹" },
  { name: "Senegal", code: "SN", flag: "🇸🇳" },
  { name: "Côte d'Ivoire", code: "CI", flag: "🇨🇮" },
  { name: "Egypt", code: "EG", flag: "🇪🇬" },
  { name: "Morocco", code: "MA", flag: "🇲🇦" },
  { name: "United States", code: "US", flag: "🇺🇸" },
  { name: "United Kingdom", code: "GB", flag: "🇬🇧" },
  { name: "Canada", code: "CA", flag: "🇨🇦" },
  { name: "Australia", code: "AU", flag: "🇦🇺" },
  { name: "India", code: "IN", flag: "🇮🇳" },
];

const locationData: Record<string, Record<string, string[]>> = {
  Nigeria: 
  {
    "Abia": [
        "Aba North",
        "Aba South",
        "Arochukwu",
        "Bende",
        "Ikwuano",
        "Isiala Ngwa North",
        "Isiala Ngwa South",
        "Isuikwuato",
        "Obingwa",
        "Ohafia",
        "Osisioma",
        "Ugwunagbo",
        "Ukwa East",
        "Ukwa West",
        "Umuahia North",
        "Umuahia South",
        "Umu Nneochi"
    ],
    "Adamawa": [
        "Madagali",
        "Michika",
        "Mubi North",
        "Mubi South",
        "Hong",
        "Gombi",
        "Song",
        "Girei",
        "Yola North",
        "Yola South",
        "Fufore",
        "Mayo Belwa",
        "Jada",
        "Ganye",
        "Toungo",
        "Demsa",
        "Numan",
        "Lamurde",
        "Guyuk",
        "Shelleng",
        "Maiha"
    ],
    "AkwaIbom": [
        "Abak",
        "Eastern Obolo",
        "Eket",
        "Esit Eket",
        "Essien Udim",
        "Etim Ekpo",
        "Etinan",
        "Ibeno",
        "Ibesikpo Asutan",
        "Ibiono-Ibom",
        "Ika",
        "Ikono",
        "Ikot Abasi",
        "Ikot Ekpene",
        "Ini",
        "Itu",
        "Mbo",
        "Mkpat-Enin",
        "Nsit-Atai",
        "Nsit-Ibom",
        "Nsit-Ubium",
        "Obot Akara",
        "Okobo",
        "Onna",
        "Oron",
        "Oruk Anam",
        "Udung-Uko",
        "Ukanafun",
        "Uruan",
        "Urue-Offong/Oruko",
        "Uyo"
    ],
    "Anambra": [
        "Aguata",
        "Anambra East",
        "Anambra West",
        "Anaocha",
        "Awka North",
        "Awka South",
        "Ayamelum",
        "Dunukofia",
        "Ekwusigo",
        "Idemili North",
        "Idemili South",
        "Ihiala",
        "Njikoka",
        "Nnewi North",
        "Nnewi South",
        "Ogbaru",
        "Onitsha North",
        "Onitsha South",
        "Orumba North",
        "Orumba South",
        "Oyi"
    ],
    "Bauchi": [
        "Alkaleri",
        "Bauchi",
        "Bogoro",
        "Dambam",
        "Darazo",
        "Dass",
        "Gamawa",
        "Ganjuwa",
        "Giade",
        "Itas/Gadau",
        "Jama'are",
        "Katagum",
        "Kirfi",
        "Misau",
        "Ningi",
        "Shira",
        "Tafawa Balewa",
        "Toro",
        "Warji",
        "Zaki"
    ],
    "Bayelsa": [
        "Brass",
        "Ekeremor",
        "Kolokuma/Opokuma",
        "Nembe",
        "Ogbia",
        "Sagbama",
        "Southern Ijaw",
        "Yenagoa"
    ],
    "Benue": [
        "Agatu",
        "Apa",
        "Ado",
        "Buruku",
        "Gboko",
        "Guma",
        "Gwer East",
        "Gwer West",
        "Katsina-Ala",
        "Konshisha",
        "Kwande",
        "Logo",
        "Makurdi",
        "Obi",
        "Ogbadibo",
        "Ohimini",
        "Oju",
        "Okpokwu",
        "Oturkpo",
        "Tarka",
        "Ukum",
        "Ushongo",
        "Vandeikya"
    ],
    "Borno": [
        "Abadam",
        "Askira/Uba",
        "Bama",
        "Bayu",
        "Biu",
        "Chibok",
        "Damboa",
        "Dikwa",
        "Gubio",
        "Guzamala",
        "Gwoza",
        "Hawul",
        "Jere",
        "Kaga",
        "Kala/Balge",
        "Konduga",
        "Kukawa",
        "Kwaya Kusar",
        "Mafa",
        "Magumeri",
        "Maiduguri",
        "Marte",
        "Mobbar",
        "Monguno",
        "Ngala",
        "Nganzai",
        "Shani"
    ],
    "CrossRiver": [
        "Abi",
        "Akamkpa",
        "Akpabuyo",
        "Bakassi",
        "Bekwarra",
        "Biase",
        "Boki",
        "Calabar Municipal",
        "Calabar South",
        "Etung",
        "Ikom",
        "Obanliku",
        "Obubra",
        "Obudu",
        "Odukpani",
        "Ogoja",
        "Yakuur",
        "Yala"
    ],
    "Delta": [
        "Aniocha North",
        "Aniocha South",
        "Bomadi",
        "Burutu",
        "Ethiope East",
        "Ethiope West",
        "Ika North East",
        "Ika South",
        "Isoko North",
        "Isoko South",
        "Ndokwa East",
        "Ndokwa West",
        "Okpe",
        "Oshimili North",
        "Oshimili South",
        "Patani",
        "Sapele",
        "Udu",
        "Ughelli North",
        "Ughelli South",
        "Ukwuani",
        "Uvwie",
        "Bomadi",
        "Warri North",
        "Warri South",
        "Warri South West"
    ],
    "Ebonyi": [
        "Abakaliki",
        "Afikpo North",
        "Afikpo South",
        "Ebonyi",
        "Ezza North",
        "Ezza South",
        "Ikwo",
        "Ishielu",
        "Ivo",
        "Izzi",
        "Ohaozara",
        "Ohaukwu",
        "Onicha"
    ],
    "Edo": [
        "Akoko-Edo",
        "Egor",
        "Esan Central",
        "Esan North-East",
        "Esan South-East",
        "Esan West",
        "Etsako Central",
        "Etsako East",
        "Etsako West",
        "Igueben",
        "Ikpoba-Okha",
        "Oredo",
        "Orhionmwon",
        "Ovia North-East",
        "Ovia South-West",
        "Owan East",
        "Owan West",
        "Uhunmwonde"
    ],
    "Ekiti": [
        "Ado-Ekiti",
        "Efon",
        "Ekiti East",
        "Ekiti South-West",
        "Ekiti West",
        "Emure",
        "Gbonyin",
        "Ido-Osi",
        "Ijero",
        "Ikere",
        "Ikole",
        "Ilejemeje",
        "Irepodun/Ifelodun",
        "Ise/Orun",
        "Moba",
        "Oye"
    ],
    "Enugu": [
        "Aninri",
        "Awgu",
        "Enugu East",
        "Enugu North",
        "Enugu South",
        "Ezeagu",
        "Igbo Etiti",
        "Igbo Eze North",
        "Igbo Eze South",
        "Isi Uzo",
        "Nkanu East",
        "Nkanu West",
        "Nsukka",
        "Oji River",
        "Udenu",
        "Udi",
        "Uzo-Uwani"
    ],
    "FCT": [
        "Abaji",
        "Bwari",
        "Gwagwalada",
        "Kuje",
        "Kwali",
        "Municipal Area Council"
    ],
    "Gombe": [
        "Akko",
        "Balanga",
        "Billiri",
        "Dukku",
        "Funakaye",
        "Gombe",
        "Kaltungo",
        "Kwami",
        "Nafada",
        "Shongom",
        "Yamaltu/Deba"
    ],
    "Imo": [
        "Aboh Mbaise",
        "Ahiazu Mbaise",
        "Ehime Mbano",
        "Ezinihitte",
        "Ideato North",
        "Ideato South",
        "Ihitte/Uboma",
        "Ikeduru",
        "Isiala Mbano",
        "Isu",
        "Mbaitoli",
        "Ngor Okpala",
        "Njaba",
        "Nkwerre",
        "Nwangele",
        "Obowo",
        "Oguta",
        "Ohaji/Egbema",
        "Okigwe",
        "Orlu",
        "Orsu",
        "Oru East",
        "Oru West",
        "Owerri Municipal",
        "Owerri North",
        "Owerri West",
        "Unuimo"
    ],
    "Jigawa": [
        "Auyo",
        "Babura",
        "Biriniwa",
        "Birnin Kudu",
        "Buji",
        "Dutse",
        "Gagarawa",
        "Garki",
        "Gumel",
        "Guri",
        "Gwaram",
        "Gwiwa",
        "Hadejia",
        "Jahun",
        "Kafamin Hausa",
        "Kaugama",
        "Kazaure",
        "Kiri Kasama",
        "Kiyawa",
        "Maigatari",
        "Malam Madori",
        "Miga",
        "Ringim",
        "Roni",
        "Sule Tankarkar",
        "Taura",
        "Yankwashi"
    ],
    "Kaduna": [
        "Birnin Gwari",
        "Chikun",
        "Giwa",
        "Kajuru",
        "Igabi",
        "Ikara",
        "Jaba",
        "Jema'a",
        "Kachia",
        "Kaduna North",
        "Kaduna South",
        "Kagarko",
        "Kauru",
        "Kubau",
        "Kudan",
        "Lere",
        "Makarfi",
        "Sabon Gari",
        "Sanga",
        "Soba",
        "Zangon Kataf",
        "Zaria"
    ],
    "Kano": [
        "Ajingi",
        "Albasu",
        "Bagwai",
        "Bebeji",
        "Bichi",
        "Bunkure",
        "Dala",
        "Dambatta",
        "Dawakin Kudu",
        "Dawakin Tofa",
        "Doguwa",
        "Fagge",
        "Gabasawa",
        "Garko",
        "Garun Mallam",
        "Gaya",
        "Gezawa",
        "Gwale",
        "Gwarzo",
        "Kabo",
        "Kano Municipal",
        "Karaye",
        "Kibiya",
        "Kiru",
        "Kumbotso",
        "Kunchi",
        "Kura",
        "Madobi",
        "Makoda",
        "Minjibir",
        "Nasarawa",
        "Rano",
        "Rimin Gado",
        "Rogo",
        "Shanono",
        "Sumaila",
        "Takai",
        "Tarauni",
        "Tofa",
        "Tsanyawa",
        "Tudun Wada",
        "Ungogo",
        "Warawa",
        "Wudil"
    ],
    "Katsina": [
        "Bakori",
        "Batagarawa",
        "Batsari",
        "Baure",
        "Bindawa",
        "Charanchi",
        "Dandume",
        "Danja",
        "Dan Musa",
        "Daura",
        "Dutsin Ma",
        "Faskari",
        "Funtua",
        "Ingawa",
        "Jibia",
        "Kafur",
        "Kaita",
        "Kankara",
        "Kankia",
        "Katsina",
        "Kurfi",
        "Kusada",
        "Mai'Adua",
        "Malumfashi",
        "Mani",
        "Mashi",
        "Matazu",
        "Musawa",
        "Rimi",
        "Sabuwa",
        "Safana",
        "Sandamu",
        "Zango"
    ],
    "Kebbi": [
        "Aleiro",
        "Arewa Dandi",
        "Argungu",
        "Augie",
        "Bagudo",
        "Birnin Kebbi",
        "Bunza",
        "Dandi",
        "Fakai",
        "Gwandu",
        "Jega",
        "Kalgo",
        "Koko/Besse",
        "Maiyama",
        "Ngaski",
        "Sakaba",
        "Shanga",
        "Suru",
        "Wasagu/Danko",
        "Yauri",
        "Zuru"
    ],
    "Kogi": [
        "Adavi",
        "Ajaokuta",
        "Ankpa",
        "Bassa",
        "Dekina",
        "Ibaji",
        "Idah",
        "Igalamela-Odolu",
        "Ijumu",
        "Kabba/Bunu",
        "Kogi",
        "Lokoja",
        "Mopa-Muro",
        "Ofu",
        "Ogori/Magongo",
        "Okehi",
        "Okene",
        "Olamaboro",
        "Omala",
        "Yagba East",
        "Yagba West"
    ],
    "Kwara": [
        "Asa",
        "Baruten",
        "Edu",
        "Ekiti",
        "Ifelodun",
        "Ilorin East",
        "Ilorin South",
        "Ilorin West",
        "Irepodun",
        "Isin",
        "Kaiama",
        "Moro",
        "Offa",
        "Oke Ero",
        "Oyun",
        "Pategi"
    ],
    "Lagos": [
        "Agege",
        "Ajeromi-Ifelodun",
        "Alimosho",
        "Amuwo-Odofin",
        "Apapa",
        "Badagry",
        "Epe",
        "Eti-Osa",
        "Ibeju-Lekki",
        "Ifako-Ijaiye",
        "Ikeja",
        "Ikorodu",
        "Kosofe",
        "Lagos Island",
        "Lagos Mainland",
        "Mushin",
        "Ojo",
        "Oshodi-Isolo",
        "Shomolu",
        "Surulere"
    ],
    "Nasarawa": [
        "Akwanga",
        "Awe",
        "Doma",
        "Karu",
        "Keana",
        "Keffi",
        "Kokona",
        "Lafia",
        "Nasarawa",
        "Nasarawa Egon",
        "Obi",
        "Toto",
        "Wamba"
    ],
    "Niger": [
        "Agaie",
        "Agwara",
        "Bida",
        "Borgu",
        "Bosso",
        "Chanchaga",
        "Edati",
        "Gbako",
        "Gurara",
        "Katcha",
        "Kontagora",
        "Lapai",
        "Lavun",
        "Magama",
        "Mariga",
        "Mashegu",
        "Minna",
        "Mokwa",
        "Moya",
        "Paikoro",
        "Rafi",
        "Rijau",
        "Shiroro",
        "Suleja",
        "Tafa",
        "Wushishi"
    ],
    "Ogun": [
        "Abeokuta North",
        "Abeokuta South",
        "Ado-Odo/Ota",
        "Ewekoro",
        "Ifo",
        "Ijebu East",
        "Ijebu North",
        "Ijebu North East",
        "Ijebu Ode",
        "Ikenne",
        "Imeko Afon",
        "Ipokia",
        "Obafemi Owode",
        "Odeda",
        "Odogbolu",
        "Ogun Waterside",
        "Remo North",
        "Shagamu",
        "Yewa North",
        "Yewa South"
    ],
    "Ondo": [
        "Akoko North-East",
        "Akoko North-West",
        "Akoko South-West",
        "Akoko South-East",
        "Akure North",
        "Akure South",
        "Ese Odo",
        "Idanre",
        "Ifedore",
        "Ilaje",
        "Ile Oluji/Okeigbo",
        "Irele",
        "Odigbo",
        "Okitipupa",
        "Ondo West",
        "Ondo East",
        "Owo",
        "Ose"
    ],
    "Osun": [
        "Atakunmosa East",
        "Atakunmosa West",
        "Aiyedaade",
        "Aiyedire",
        "Boluwaduro",
        "Boripe",
        "Ede North",
        "Ede South",
        "Ife Central",
        "Ife East",
        "Ife North",
        "Ife South",
        "Egbedore",
        "Ejigbo",
        "Ifedayo",
        "Ifelodun",
        "Ila",
        "Ilesa East",
        "Ilesa West",
        "Irepodun",
        "Irewole",
        "Isokan",
        "Iwo",
        "Obokun",
        "Odo Otin",
        "Ola Oluwa",
        "Olorunda",
        "Oriade",
        "Orolu",
        "Osogbo"
    ],
    "Oyo": [
        "Afijio",
        "Akinyele",
        "Atiba",
        "Atisbo",
        "Egbeda",
        "Ibadan North",
        "Ibadan North-East",
        "Ibadan North-West",
        "Ibadan South-East",
        "Ibadan South-West",
        "Ibarapa Central",
        "Ibarapa East",
        "Ibarapa North",
        "Ido",
        "Irepo",
        "Iseyin",
        "Itesiwaju",
        "Iwajowa",
        "Kajola",
        "Lagelu",
        "Ogbomosho North",
        "Ogbomosho South",
        "Ogo Oluwa",
        "Olorunsogo",
        "Oluyole",
        "Ona Ara",
        "Orelope",
        "Ori Ire",
        "Oyo East",
        "Oyo West",
        "Saki East",
        "Saki West",
        "Surulere"
    ],
    "Plateau": [
        "Barkin Ladi",
        "Bassa",
        "Bokkos",
        "Jos East",
        "Jos North",
        "Jos South",
        "Kanam",
        "Kanke",
        "Langtang North",
        "Langtang South",
        "Mangu",
        "Mikang",
        "Pankshin",
        "Qua'an Pan",
        "Riyom",
        "Shendam",
        "Wase"
    ],
    "Rivers": [
        "Abua/Odual",
        "Ahoada East",
        "Ahoada West",
        "Akuku-Toru",
        "Andoni",
        "Asari-Toru",
        "Bonny",
        "Degema",
        "Eleme",
        "Emuoha",
        "Etche",
        "Gokana",
        "Ikwerre",
        "Khana",
        "Obio/Akpor",
        "Ogba/Egbema/Ndoni",
        "Ogu/Bolo",
        "Okrika",
        "Omuma",
        "Opobo/Nkoro",
        "Oyigbo",
        "Port Harcourt",
        "Tai"
    ],
    "Sokoto": [
        "Binji",
        "Bodinga",
        "Dange Shuni",
        "Gada",
        "Goronyo",
        "Gudu",
        "Gwadabawa",
        "Illela",
        "Isa",
        "Kebbe",
        "Kware",
        "Rabah",
        "Sabon Birni",
        "Shagari",
        "Silame",
        "Sokoto North",
        "Sokoto South",
        "Tambuwal",
        "Tangaza",
        "Tureta",
        "Wamako",
        "Wurno",
        "Yabo"
    ],
    "Taraba": [
        "Ardo Kola",
        "Bali",
        "Donga",
        "Gashaka",
        "Gassol",
        "Ibi",
        "Jalingo",
        "Karim Lamido",
        "Kumi",
        "Lau",
        "Sardauna",
        "Takum",
        "Ussa",
        "Wukari",
        "Yorro",
        "Zing"
    ],
    "Yobe": [
        "Bade",
        "Bursari",
        "Damaturu",
        "Fika",
        "Fune",
        "Geidam",
        "Gujba",
        "Gulani",
        "Jakusko",
        "Karasuwa",
        "Machina",
        "Nangere",
        "Nguru",
        "Potiskum",
        "Tarmuwa",
        "Yunusari",
        "Yusufari"
    ],
    "Zamfara": [
        "Anka",
        "Bakura",
        "Birnin Magaji/Kiyaw",
        "Bukkuyum",
        "Bungudu",
        "Gummi",
        "Gusau",
        "Kaura Namoda",
        "Maradun",
        "Maru",
        "Shinkafi",
        "Talata Mafara",
        "Chafe",
        "Zurmi"
    ]
},
  // {
  //   Abia: ["Aba", "Umuahia", "Arochukwu", "Ohafia"],
  //   Adamawa: ["Yola", "Mubi", "Numan", "Jimeta"],
  //   AkwaIbom: ["Uyo", "Eket", "Ikot Ekpene", "Oron"],
  //   Anambra: ["Awka", "Onitsha", "Nnewi", "Ekwulobia"],
  //   Bauchi: ["Bauchi", "Azare", "Misau", "Jama'are"],
  //   Bayelsa: ["Yenagoa", "Ogbia", "Brass", "Amassoma"],
  //   Benue: ["Makurdi", "Gboko", "Otukpo", "Katsina-Ala"],
  //   Borno: ["Maiduguri", "Bama", "Biu", "Dikwa"],
  //   CrossRiver: ["Calabar", "Ikom", "Ogoja", "Ugep"],
  //   Delta: ["Asaba", "Warri", "Sapele", "Ughelli"],
  //   Ebonyi: ["Abakaliki", "Afikpo", "Onueke"],
  //   Edo: ["Benin City", "Auchi", "Uromi", "Ekpoma"],
  //   Ekiti: ["Ado Ekiti", "Ikere", "Ijero", "Ikole"],
  //   Enugu: ["Enugu", "Nsukka", "Awgu", "Udi"],
  //   FCT: ["Abuja", "Gwagwalada", "Kuje", "Bwari"],
  //   Gombe: ["Gombe", "Kaltungo", "Duku"],
  //   Imo: ["Owerri", "Orlu", "Okigwe"],
  //   Jigawa: ["Dutse", "Hadejia", "Kazaure", "Gumel"],
  //   Kaduna: ["Kaduna", "Zaria", "Kafanchan", "Saminaka"],
  //   Kano: ["Kano", "Wudil", "Gwarzo", "Dambatta"],
  //   Katsina: ["Katsina", "Daura", "Funtua"],
  //   Kebbi: ["Birnin Kebbi", "Argungu", "Yauri"],
  //   Kogi: ["Lokoja", "Okene", "Idah", "Kabba"],
  //   Kwara: ["Ilorin", "Offa", "Jebba", "Omu-Aran"],
  //   Lagos: ["Ikeja", "Lagos Island", "Ikorodu", "Epe", "Badagry"],
  //   Nasarawa: ["Lafia", "Keffi", "Akwanga", "Karu"],
  //   Niger: ["Minna", "Bida", "Suleja", "Kontagora"],
  //   Ogun: ["Abeokuta", "Ijebu-Ode", "Sagamu", "Sango Otta"],
  //   Ondo: ["Akure", "Ondo City", "Owo", "Okitipupa"],
  //   Osun: ["Osogbo", "Ile-Ife", "Ilesa", "Ede"],
  //   Oyo: ["Ibadan", "Ogbomosho", "Oyo", "Iseyin"],
  //   Plateau: ["Jos", "Pankshin", "Shendam", "Bukuru"],
  //   Rivers: ["Port Harcourt", "Obio-Akpor", "Bonny", "Eleme"],
  //   Sokoto: ["Sokoto", "Tambuwal", "Gwadabawa"],
  //   Taraba: ["Jalingo", "Wukari", "Bali", "Gembu"],
  //   Yobe: ["Damaturu", "Potiskum", "Gashua"],
  //   Zamfara: ["Gusau", "Kaura Namoda", "Talata Mafara"]
  // },

  Ghana: {
    Ashanti: ["Kumasi", "Obuasi", "Bekwai", "Mampong"],
    GreaterAccra: ["Accra", "Tema", "Madina", "Teshie"],
    Central: ["Cape Coast", "Winneba", "Kasoa", "Elmina"],
    Eastern: ["Koforidua", "Nkawkaw", "Nsawam"],
    Western: ["Sekondi-Takoradi", "Tarkwa", "Axim"],
    Northern: ["Tamale", "Yendi", "Savelugu"],
    Volta: ["Ho", "Keta", "Aflao", "Kpandu"],
    Bono: ["Sunyani", "Berekum", "Dormaa Ahenkro"],
    BonoEast: ["Techiman", "Kintampo", "Nkoranza"],
    Ahafo: ["Goaso", "Hwidiem", "Bechem"],
    Savannah: ["Damongo", "Bole", "Salaga"],
    NorthEast: ["Nalerigu", "Walewale", "Gambaga"],
    UpperEast: ["Bolgatanga", "Navrongo", "Bawku"],
    UpperWest: ["Wa", "Lawra", "Tumu"],
    WesternNorth: ["Sefwi Wiawso", "Bibiani", "Enchi"],
    Oti: ["Dambai", "Nkwanta", "Kadjebi"]
  },

  Cameroon: {
    Centre: ["Yaoundé", "Mbalmayo", "Bafia"],
    Littoral: ["Douala", "Edéa", "Nkongsamba"],
    West: ["Bafoussam", "Dschang", "Foumban", "Bangangté"],
    Northwest: ["Bamenda", "Kumbo", "Wum"],
    Southwest: ["Buea", "Limbe", "Kumba", "Tiko"],
    North: ["Garoua", "Guider", "Figuil"],
    FarNorth: ["Maroua", "Yagoua", "Mokolo"],
    Adamawa: ["Ngaoundéré", "Banyo", "Meiganga"],
    East: ["Bertoua", "Batouri", "Abong-Mbang"],
    South: ["Ebolowa", "Kribi", "Sangmélima"]
  },

  Kenya: {
    Nairobi: ["Nairobi City", "Westlands", "Kibera"],
    Mombasa: ["Mombasa City", "Nyali", "Likoni"],
    Kisumu: ["Kisumu City", "Maseno", "Ahero"],
    Nakuru: ["Nakuru", "Naivasha", "Gilgil"],
    UasinGishu: ["Eldoret", "Turbo", "Burnt Forest"],
    Kiambu: ["Thika", "Ruiru", "Kikuyu", "Limuru"],
    Machakos: ["Machakos", "Athi River", "Kangundo"],
    Kakamega: ["Kakamega", "Mumias", "Lugari"],
    Meru: ["Meru", "Maua", "Nkubu"],
    Kilifi: ["Kilifi", "Malindi", "Mtwapa"]
    // Note: Kept to top 10 counties for brevity, though Kenya has 47.
  },

  SouthAfrica: {
    Gauteng: ["Johannesburg", "Pretoria", "Soweto", "Centurion"],
    WesternCape: ["Cape Town", "Stellenbosch", "George", "Paarl"],
    KwaZuluNatal: ["Durban", "Pietermaritzburg", "Richards Bay"],
    EasternCape: ["Gqeberha (Port Elizabeth)", "East London", "Mthatha"],
    FreeState: ["Bloemfontein", "Welkom", "Kroonstad"],
    Mpumalanga: ["Mbombela (Nelspruit)", "Witbank", "Secunda"],
    Limpopo: ["Polokwane", "Tzaneen", "Mokopane"],
    NorthWest: ["Rustenburg", "Mahikeng", "Potchefstroom"],
    NorthernCape: ["Kimberley", "Upington", "Springbok"]
  },

  Uganda: {
    Central: ["Kampala", "Entebbe", "Masaka", "Mukono"],
    Western: ["Mbarara", "Fort Portal", "Kasese", "Hoima"],
    Eastern: ["Jinja", "Mbale", "Tororo", "Soroti"],
    Northern: ["Gulu", "Lira", "Arua", "Kitgum"]
  },

  Tanzania: {
    DarEsSalaam: ["Ilala", "Kinondoni", "Temeke"],
    Dodoma: ["Dodoma", "Kondoa", "Mpwapwa"],
    Arusha: ["Arusha City", "Karatu", "Meru"],
    Mwanza: ["Mwanza City", "Ilemela", "Nyamagana"],
    Kilimanjaro: ["Moshi", "Same", "Rombo"],
    Zanzibar: ["Zanzibar City", "Mkokotoni", "Chake Chake"]
  },

  Rwanda: {
    Kigali: ["Gasabo", "Kicukiro", "Nyarugenge"],
    Northern: ["Musanze", "Gicumbi", "Rulindo"],
    Southern: ["Huye", "Muhanga", "Nyanza"],
    Eastern: ["Rwamagana", "Nyagatare", "Kayonza"],
    Western: ["Rubavu", "Rusizi", "Karongi"]
  },

  Ethiopia: {
    AddisAbaba: ["Bole", "Yeka", "Kirkos"],
    Oromia: ["Adama", "Jimma", "Bishoftu"],
    Amhara: ["Bahir Dar", "Gondar", "Dessie"],
    Tigray: ["Mekelle", "Axum", "Adigrat"],
    Somali: ["Jijiga", "Godé", "Kebridehar"],
    DireDawa: ["Dire Dawa"]
  },

  Senegal: {
    Dakar: ["Dakar", "Pikine", "Guédiawaye", "Rufisque"],
    Thies: ["Thiès", "Mbour", "Tivaouane"],
    SaintLouis: ["Saint-Louis", "Richard Toll", "Dagana"],
    Diourbel: ["Touba", "Diourbel", "Mbacké"],
    Ziguinchor: ["Ziguinchor", "Bignona", "Oussouye"]
  },

  "Côte d'Ivoire": {
    Abidjan: ["Cocody", "Yopougon", "Abobo", "Marcory"],
    Yamoussoukro: ["Yamoussoukro", "Attiégouakro"],
    BasSassandra: ["San-Pédro", "Soubré", "Sassandra"],
    ValleeDuBandama: ["Bouaké", "Katiola", "Dabakala"],
    Savanes: ["Korhogo", "Boundiali", "Ferkessédougou"]
  },

  Egypt: {
    Cairo: ["Nasr City", "Maadi", "Heliopolis", "New Cairo"],
    Alexandria: ["Montaza", "Smouha", "Borg El Arab"],
    Giza: ["Dokki", "Agouza", "6th of October City"],
    Dakahlia: ["Mansoura", "Mit Ghamr", "Talkha"],
    RedSea: ["Hurghada", "Safaga", "Marsa Alam"]
  },

  Morocco: {
    CasablancaSettat: ["Casablanca", "Mohammedia", "El Jadida"],
    RabatSaleKenitra: ["Rabat", "Salé", "Kénitra"],
    MarrakechSafi: ["Marrakech", "Safi", "Essaouira"],
    FesMeknes: ["Fès", "Meknès", "Taza"],
    TangerTetouanAlHoceima: ["Tangier", "Tétouan", "Chefchaouen"]
  },

  UnitedStates: {
    California: ["Los Angeles", "San Francisco", "San Diego", "Sacramento"],
    Texas: ["Houston", "Austin", "Dallas", "San Antonio"],
    NewYork: ["New York City", "Buffalo", "Rochester", "Albany"],
    Florida: ["Miami", "Orlando", "Tampa", "Jacksonville"],
    Illinois: ["Chicago", "Springfield", "Peoria"]
    // Example subset.
  },

  UnitedKingdom: {
    England: ["London", "Manchester", "Birmingham", "Bristol"],
    Scotland: ["Edinburgh", "Glasgow", "Aberdeen", "Dundee"],
    Wales: ["Cardiff", "Swansea", "Newport"],
    NorthernIreland: ["Belfast", "Derry", "Lisburn"]
  },

  Canada: {
    Ontario: ["Toronto", "Ottawa", "Mississauga", "Hamilton"],
    Quebec: ["Montreal", "Quebec City", "Laval", "Gatineau"],
    BritishColumbia: ["Vancouver", "Victoria", "Surrey", "Kelowna"],
    Alberta: ["Calgary", "Edmonton", "Red Deer"],
    NovaScotia: ["Halifax", "Sydney", "Truro"]
  },

  Australia: {
    NewSouthWales: ["Sydney", "Newcastle", "Wollongong"],
    Victoria: ["Melbourne", "Geelong", "Ballarat"],
    Queensland: ["Brisbane", "Gold Coast", "Cairns"],
    WesternAustralia: ["Perth", "Fremantle", "Mandurah"],
    SouthAustralia: ["Adelaide", "Mount Gambier", "Gawler"]
  },

  India: {
    "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Tirupati", "Kurnool", "Kakinada", "Rajahmundry", "Kadapa", "Anantapur", "Eluru", "Vizianagaram"],
    "Arunachal Pradesh": ["Itanagar", "Tawang", "Naharlagun", "Pasighat", "Ziro", "Bomdila", "Tezu", "Khonsa"],
    "Assam": ["Guwahati", "Dibrugarh", "Silchar", "Jorhat", "Nagaon", "Tinsukia", "Tezpur", "Bongaigaon", "Dhubri", "Karimganj"],
    "Bihar": ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Purnia", "Darbhanga", "Bihar Sharif", "Arrah", "Begusarai", "Katihar", "Munger", "Chhapra"],
    "Chhattisgarh": ["Raipur", "Bhilai", "Bilaspur", "Korba", "Rajnandgaon", "Raigarh", "Jagdalpur", "Ambikapur", "Dhamtari"],
    "Goa": ["Panaji", "Margao", "Vasco da Gama", "Mapusa", "Ponda"],
    "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Junagadh", "Gandhinagar", "Anand", "Morbi", "Nadiad", "Bharuch"],
    "Haryana": ["Faridabad", "Gurugram", "Panipat", "Ambala", "Yamunanagar", "Rohtak", "Hisar", "Karnal", "Sonipat", "Panchkula", "Sirsa"],
    "Himachal Pradesh": ["Shimla", "Dharamshala", "Solan", "Mandi", "Nahan", "Una", "Hamirpur", "Kullu", "Chamba"],
    "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro Steel City", "Deoghar", "Phusro", "Hazaribagh", "Giridih", "Ramgarh"],
    "Karnataka": ["Bengaluru", "Mysuru", "Mangaluru", "Hubli-Dharwad", "Belagavi", "Ballari", "Kalaburagi", "Davanagere", "Shivamogga", "Tumakuru", "Udupi"],
    "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode", "Kollam", "Thrissur", "Alappuzha", "Palakkad", "Kannur", "Kottayam", "Malappuram"],
    "Madhya Pradesh": ["Indore", "Bhopal", "Jabalpur", "Gwalior", "Ujjain", "Sagar", "Dewas", "Satna", "Ratlam", "Rewa", "Murwara (Katni)", "Singrauli"],
    "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Thane", "Pimpri-Chinchwad", "Kalyan-Dombivli", "Vasai-Virar", "Aurangabad", "Navi Mumbai", "Solapur", "Mira-Bhayandar", "Bhiwandi", "Amravati", "Nanded", "Kolhapur"],
    "Manipur": ["Imphal", "Churachandpur", "Thoubal", "Kakching", "Ukhrul"],
    "Meghalaya": ["Shillong", "Tura", "Jowai", "Nongpoh", "Williamnagar"],
    "Mizoram": ["Aizawl", "Lunglei", "Saiha", "Champhai", "Kolasib"],
    "Nagaland": ["Dimapur", "Kohima", "Mokokchung", "Tuensang", "Wokha", "Zunheboto"],
    "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur", "Puri", "Balasore", "Bhadrak", "Baripada", "Jharsuguda"],
    "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Mohali", "Hoshiarpur", "Pathankot", "Moga", "Abohar"],
    "Rajasthan": ["Jaipur", "Jodhpur", "Kota", "Bikaner", "Ajmer", "Udaipur", "Bhilwara", "Alwar", "Bharatpur", "Sikar", "Sri Ganganagar", "Pali"],
    "Sikkim": ["Gangtok", "Namchi", "Geyzing", "Mangan"],
    "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli", "Tiruppur", "Erode", "Vellore", "Thoothukudi", "Dindigul", "Thanjavur"],
    "Telangana": ["Hyderabad", "Warangal", "Nizamabad", "Khammam", "Karimnagar", "Ramagundam", "Mahbubnagar", "Nalgonda", "Adilabad"],
    "Tripura": ["Agartala", "Dharmanagar", "Udaipur", "Kailasahar", "Ambassa"],
    "Uttar Pradesh": ["Lucknow", "Kanpur", "Varanasi", "Agra", "Meerut", "Ghaziabad", "Prayagraj", "Bareilly", "Aligarh", "Moradabad", "Saharanpur", "Gorakhpur", "Noida", "Firozabad", "Jhansi", "Muzaffarnagar"],
    "Uttarakhand": ["Dehradun", "Haridwar", "Roorkee", "Haldwani", "Rudrapur", "Kashipur", "Rishikesh"],
    "West Bengal": ["Kolkata", "Asansol", "Siliguri", "Durgapur", "Bardhaman", "Malda", "Baharampur", "Habra", "Kharagpur", "Shantipur", "Dankuni"],
    "Andaman and Nicobar Islands": ["Port Blair"],
    "Chandigarh": ["Chandigarh"],
    "Dadra and Nagar Haveli and Daman and Diu": ["Daman", "Diu", "Silvassa"],
    "Delhi": ["New Delhi", "North Delhi", "South Delhi", "East Delhi", "West Delhi", "Dwarka", "Rohini"],
    "Jammu and Kashmir": ["Srinagar", "Jammu", "Anantnag", "Baramulla", "Kathua", "Samba"],
    "Ladakh": ["Leh", "Kargil"],
    "Lakshadweep": ["Kavaratti", "Agatti", "Amini"],
    "Puducherry": ["Puducherry", "Karaikal", "Mahe", "Yanam"]
  }
  // India: {
  //   Maharashtra: ["Mumbai", "Pune", "Nagpur", "Nashik"],
  //   Delhi: ["New Delhi", "North Delhi", "South Delhi"],
  //   Karnataka: ["Bengaluru", "Mysuru", "Mangaluru", "Hubli"],
  //   TamilNadu: ["Chennai", "Coimbatore", "Madurai"],
  //   Gujarat: ["Ahmedabad", "Surat", "Vadodara"],
  //   UttarPradesh: ["Lucknow", "Kanpur", "Varanasi", "Agra"]
  // }
};



// const countries = [
//   { name: "Nigeria", code: "NG", flag: "🇳🇬" },
//   { name: "Ghana", code: "GH", flag: "🇬🇭" },
//   { name: "Cameroon", code: "CM", flag: "🇨🇲" },
//   { name: "Kenya", code: "KE", flag: "🇰🇪" },
//   { name: "South Africa", code: "ZA", flag: "🇿🇦" },
//   { name: "Uganda", code: "UG", flag: "🇺🇬" },
//   { name: "Tanzania", code: "TZ", flag: "🇹🇿" },
//   { name: "Rwanda", code: "RW", flag: "🇷🇼" },
//   { name: "Ethiopia", code: "ET", flag: "🇪🇹" },
//   { name: "Senegal", code: "SN", flag: "🇸🇳" },
//   { name: "Côte d'Ivoire", code: "CI", flag: "🇨🇮" },
//   { name: "Egypt", code: "EG", flag: "🇪🇬" },
//   { name: "Morocco", code: "MA", flag: "🇲🇦" },
//   { name: "United States", code: "US", flag: "🇺🇸" },
//   { name: "United Kingdom", code: "GB", flag: "🇬🇧" },
//   { name: "Canada", code: "CA", flag: "🇨🇦" },
//   { name: "Australia", code: "AU", flag: "🇦🇺" },
//   { name: "India", code: "IN", flag: "🇮🇳" },
// ];

// const locationData: Record<string, Record<string, string[]>> = {
//   Nigeria: {
//     Abia: [
//       "Aba North", "Aba South", "Arochukwu", "Bende", "Ikwuano", "Isiala Ngwa North",
//       "Isiala Ngwa South", "Isuikwuato", "Obingwa", "Ohafia", "Osisioma", "Ugwunagbo",
//       "Ukwa East", "Ukwa West", "Umuahia North", "Umuahia South", "Umu Nneochi",
//     ],
//     Lagos: [
//       "Agege", "Ajeromi-Ifelodun", "Alimosho", "Amuwo-Odofin", "Apapa", "Badagry",
//       "Epe", "Eti-Osa", "Ibeju-Lekki", "Ifako-Ijaiye", "Ikeja", "Ikorodu", "Kosofe",
//       "Lagos Island", "Lagos Mainland", "Mushin", "Ojo", "Oshodi-Isolo", "Shomolu", "Surulere",
//     ],
//     FCT: ["Abaji", "Bwari", "Gwagwalada", "Kuje", "Kwali", "Municipal Area Council"],
//     // ... truncated other states for brevity. Keep your original full list here!
//   }
// };

const PatientRegistration: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mrnFromUrl = searchParams.get("mrn");

  const { notify } = useNotification();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoadingPatient, setIsLoadingPatient] = useState(false);
  const [isFetchingMother, setIsFetchingMother] = useState(false); // NEW STATE
  const [isEditMode, setIsEditMode] = useState(!mrnFromUrl);
  const [generatedMRN, setGeneratedMRN] = useState<string>("");

  // Search input state
  const [searchInput, setSearchInput] = useState("");

  // Tab State for Row 2
  const [activeBottomTab, setActiveBottomTab] = useState<"clinical" | "consent">("clinical");

  // Payer & Referral specific state
  const [payerTypes, setPayerTypes] = useState<any[]>([]);
  const [availablePayers, setAvailablePayers] = useState<any[]>([]);
  const [referralSources, setReferralSources] = useState<any[]>([]);
  const [loadingPayers, setLoadingPayers] = useState(false);
  const [selectedPayerTypeId, setSelectedPayerTypeId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    pt_info: {
      first_name: "",
      middle_name: "",
      last_name: "",
      gender: "",
      date_of_birth: "",
      phone: "",
      email: "",
      address: "",
      marital_status: "",
      nationality: "Nigeria",
      state_of_origin: "",
      lga: "",
      photo_url: "",
      is_emergency: false,
      is_newborn: false,
      linked_parent_id: "",
      birth_time: "",
      delivery_type: "",
      gestational_age_weeks: "",
      nok_full_name: "",
      nok_relationship: "",
      nok_phone: "",
      nok_alternate_phone: "",
      nok_address: "",
    },
    medical_profile: {
      blood_group: "",
      genotype: "",
      known_allergies: "",
      chronic_conditions: "",
      disability_notes: "",
      special_alerts: "",
    },
    emergency_contacts: [
      {
        full_name: "",
        relationship: "",
        phone: "",
        alternate_phone: "",
        address: "",
        is_primary: true,
      },
    ],
    payer: {
      payer_type: "",
      payer_id: 0,
      policy_number: "",
    },
    referral: {
      referral_source_id: 1,
      referring_doctor_name: "",
      referring_facility_name: "",
      referred_by_name: "",
      referral_channel_detail: "",
      campaign_code: "",
      notes: "",
    },
    disclosure_consent: {
      pref_do_not_share: false,
      pref_share_listed: true,
      pref_share_family: false,
      pref_share_caregiver: false,
      pref_discuss_present: false,
      pref_emergency_listed: true,
      info_diagnosis: true,
      info_test_results: true,
      info_treatment_plan: true,
      info_medication: true,
      info_surgical_procedures: true,
      info_progress_updates: true,
      info_discharge_plans: true,
      info_billing: true,
      info_all: true,
      patient_signed: false,
      patient_signature_data: "",
      witness_name: "",
      witness_signed: false,
      witness_signature_data: "",
    },
    authorized_persons: [
      { full_name: "", relationship: "", phone: "" },
      { full_name: "", relationship: "", phone: "" },
      { full_name: "", relationship: "", phone: "" },
    ],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dragActive, setDragActive] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const activeReferralCode =
    referralSources.find((s) => s.id === formData.referral.referral_source_id)?.code || "";

  // Initial Data Load
  useEffect(() => {
    const init = async () => {
      try {
        const [pTypes, rSources] = await Promise.all([
          patientService.getPayerTypes(),
          patientService.getReferralSources(),
        ]);
        setPayerTypes(pTypes);
        setReferralSources(rSources);

        if (mrnFromUrl) {
          setIsLoadingPatient(true);
          const data = await patientService.getPatientByMrn(mrnFromUrl);
          if (data) {
            const nok = data.next_of_kin || {};
            setFormData({
              ...formData,
              pt_info: {
                ...formData.pt_info,
                ...data.demographics,
                marital_status: data.demographics?.marital_status || "",
                nationality: data.demographics?.nationality || "Nigeria",
                state_of_origin: data.demographics?.state_of_origin || "",
                lga: data.demographics?.lga || "",
                photo_url: data.demographics?.photo_url || "",
                is_emergency: data.demographics?.is_emergency === 1 || data.demographics?.is_emergency === true,
                is_newborn: data.demographics?.is_newborn === 1 || data.demographics?.is_newborn === true,
                linked_parent_id: data.demographics?.linked_parent_id || "",
                birth_time: data.demographics?.birth_time || "",
                delivery_type: data.demographics?.delivery_type || "",
                gestational_age_weeks: data.demographics?.gestational_age_weeks || "",
                nok_full_name: nok.full_name || data.demographics?.nok_full_name || "",
                nok_relationship: nok.relationship || data.demographics?.nok_relationship || "",
                nok_phone: nok.phone || data.demographics?.nok_phone || "",
                nok_alternate_phone: nok.alternate_phone || data.demographics?.nok_alternate_phone || "",
                nok_address: nok.address || data.demographics?.nok_address || "",
              },
              medical_profile: {
                ...formData.medical_profile,
                ...data.medical_profile,
                disability_notes: data.medical_profile?.disability_notes || "",
              },
              emergency_contacts:
                data.emergency_contacts?.length > 0
                  ? [
                      {
                        ...data.emergency_contacts[0],
                        is_primary:
                          data.emergency_contacts[0].is_primary === 1 ||
                          data.emergency_contacts[0].is_primary === true,
                      },
                    ]
                  : formData.emergency_contacts,
              payer: {
                payer_type: data.payer?.payer_type || "",
                payer_id: data.payer?.payer_id || data.payer?.id || 0,
                policy_number: data.payer?.policy_number || "",
              },
              referral: data.referral || formData.referral,
              disclosure_consent: data.disclosure_consent || formData.disclosure_consent,
              authorized_persons:
                data.authorized_persons?.length > 0
                  ? [
                      data.authorized_persons[0] || { full_name: "", relationship: "", phone: "" },
                      data.authorized_persons[1] || { full_name: "", relationship: "", phone: "" },
                      data.authorized_persons[2] || { full_name: "", relationship: "", phone: "" },
                    ]
                  : formData.authorized_persons,
            });

            if (data.payer?.payer_type) {
              const matchedType = pTypes.find((t: any) => t.code === data.payer.payer_type);
              if (matchedType) {
                setSelectedPayerTypeId(matchedType.id);
                const payers = await patientService.getPayers(matchedType.id);
                setAvailablePayers(payers);

                if (data.payer.payer_name && (!data.payer.payer_id && !data.payer.id)) {
                  const matchedPayer = payers.find(
                    (p: any) => p.name.toLowerCase() === data.payer.payer_name.toLowerCase()
                  );
                  if (matchedPayer) {
                    setFormData((prev) => ({
                      ...prev,
                      payer: { ...prev.payer, payer_id: matchedPayer.id },
                    }));
                  }
                }
              }
            }
            setIsEditMode(false);
          }
          setIsLoadingPatient(false);
        }
      } catch (err) {
        notify("System load error", "error");
        setIsLoadingPatient(false);
      }
    };
    init();
  }, [mrnFromUrl]);

  // NEW METHOD: Auto-fetch mother details using Mother MRN
  const fetchMotherDetails = async (motherMrn: string) => {
    if (!motherMrn.trim()) {
      notify("Please enter a valid Mother MRN", "warning");
      return;
    }

    setIsFetchingMother(true);
    try {
      // Assuming getPatientByMrn handles search logic
      const motherData = await patientService.getPatientByMrn(motherMrn.trim());
      
      if (motherData) {
        const motherNok = motherData.next_of_kin || {};
        const motherPayer = motherData.payer || {};
        
        setFormData((prev) => ({
          ...prev,
          pt_info: {
            ...prev.pt_info,
            last_name: motherData.demographics?.last_name || prev.pt_info.last_name,
            address: motherData.demographics?.address || prev.pt_info.address,
            phone: motherData.demographics?.phone || prev.pt_info.phone,
            nationality: motherData.demographics?.nationality || prev.pt_info.nationality,
            state_of_origin: motherData.demographics?.state_of_origin || prev.pt_info.state_of_origin,
            lga: motherData.demographics?.lga || prev.pt_info.lga,
            nok_full_name: motherNok.full_name || motherData.demographics?.nok_full_name || prev.pt_info.nok_full_name,
            nok_relationship: motherNok.relationship || motherData.demographics?.nok_relationship || prev.pt_info.nok_relationship,
            nok_phone: motherNok.phone || motherData.demographics?.nok_phone || prev.pt_info.nok_phone,
            nok_alternate_phone: motherNok.alternate_phone || motherData.demographics?.nok_alternate_phone || prev.pt_info.nok_alternate_phone,
            nok_address: motherNok.address || motherData.demographics?.nok_address || prev.pt_info.nok_address,
          },
          emergency_contacts: motherData.emergency_contacts?.length > 0 
            ? motherData.emergency_contacts.map((ec: any) => ({ ...ec, is_primary: true })) 
            : prev.emergency_contacts,
          payer: motherPayer.payer_type ? {
            payer_type: motherPayer.payer_type,
            payer_id: motherPayer.payer_id || motherPayer.id || 0,
            policy_number: motherPayer.policy_number || "",
          } : prev.payer,
        }));

        notify("Mother details successfully fetched & applied", "success");

        // Load correct Payer List if inherited
        if (motherPayer.payer_type) {
            const matchedType = payerTypes.find((t: any) => t.code === motherPayer.payer_type);
            if (matchedType) {
              setSelectedPayerTypeId(matchedType.id);
              fetchPayersList(matchedType.id);
            }
        }
      } else {
        notify("Could not locate a patient with this MRN", "warning");
      }
    } catch (error) {
      notify("Failed to retrieve Mother's details. Check MRN.", "error");
    } finally {
      setIsFetchingMother(false);
    }
  };

  const handleMotherMRNKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      fetchMotherDetails(formData.pt_info.linked_parent_id);
    }
  };

  const fetchPayersList = async (typeId: number) => {
    setLoadingPayers(true);
    try {
      const data = await patientService.getPayers(typeId);
      setAvailablePayers(data);
    } catch (err) {
      notify("Failed to load specific providers", "error");
    } finally {
      setLoadingPayers(false);
    }
  };

  const calculateAge = (dob: string) => {
    if (!dob) return "";
    const birthDate = new Date(dob);
    const today = new Date();

    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    let days = today.getDate() - birthDate.getDate();

    if (days < 0) {
      months--;
      const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += prevMonth.getDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }

    const parts = [];
    if (years > 0) parts.push(`${years} yr${years > 1 ? "s" : ""}`);
    if (months > 0) parts.push(`${months} mth${months > 1 ? "s" : ""}`);
    if (days > 0 || (years === 0 && months === 0)) parts.push(`${days} d`);

    return parts.join(" ");
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const isEmergency = formData.pt_info.is_emergency;
    const isNewborn = formData.pt_info.is_newborn;

    if (!formData.pt_info.first_name) newErrors.first_name = "Required";
    if (!formData.pt_info.last_name) newErrors.last_name = "Required";

    if (isNewborn) {
      if (!formData.pt_info.linked_parent_id) newErrors.linked_parent_id = "Required";
    } else if (!isEmergency) {
      if (!formData.pt_info.phone) newErrors.phone = "Required";
      if (!formData.pt_info.date_of_birth) newErrors.dob = "Required";
      if (!formData.pt_info.gender) newErrors.gender = "Required";
      if (!formData.pt_info.address) newErrors.address = "Required";
      if (!formData.emergency_contacts[0].full_name) newErrors.emergency_contact_name = "Required";
      if (!formData.emergency_contacts[0].phone) newErrors.emergency_contact_phone = "Required";
      if (!formData.pt_info.nok_full_name) newErrors.next_of_kin_name = "Required";
      if (!formData.pt_info.nok_phone) newErrors.next_of_kin_phone = "Required";
      if (!formData.payer.payer_type) newErrors.payer_type = "Required";
      if (!formData.payer.payer_id) newErrors.payer_id = "Required";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      notify("Please fill in mandatory fields", "warning");
      if (newErrors.emergency_contact_name || newErrors.payer_type || newErrors.payer_id) {
        setActiveBottomTab("clinical");
      }
    }
    return Object.keys(newErrors).length === 0;
  };

  const handlePhoneInput = (value: string, updateFn: (val: string) => void) => {
    const numericValue = value.replace(/[^0-9]/g, "");
    updateFn(numericValue);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim().length > 0) {
      navigate(`?mrn=${searchInput.trim()}`);
      setSearchInput("");
    }
  };

  const handleCountryChange = (countryName: string) => {
    setFormData((prev) => ({
      ...prev,
      pt_info: {
        ...prev.pt_info,
        nationality: countryName,
        state_of_origin: "",
        lga: "",
      },
    }));
  };

  const handleStateChange = (stateName: string) => {
    setFormData((prev) => ({
      ...prev,
      pt_info: {
        ...prev.pt_info,
        state_of_origin: stateName,
        lga: "",
      },
    }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      notify("Please upload an image file", "warning");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      updatePTInfo("photo_url", reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const startCamera = async () => {
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      notify("Could not access camera", "error");
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach((track) => track.stop());
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg");
      updatePTInfo("photo_url", dataUrl);
      stopCamera();
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const payloadData = {
        pt_info: {
          first_name: formData.pt_info.first_name,
          middle_name: formData.pt_info.middle_name,
          last_name: formData.pt_info.last_name,
          gender: formData.pt_info.gender,
          date_of_birth: formData.pt_info.date_of_birth,
          phone: formData.pt_info.phone,
          email: formData.pt_info.email,
          address: formData.pt_info.address,
          marital_status: formData.pt_info.marital_status,
          nationality: formData.pt_info.nationality,
          state_of_origin: formData.pt_info.state_of_origin,
          lga: formData.pt_info.lga,
          photo_url: formData.pt_info.photo_url || "",
          is_emergency: formData.pt_info.is_emergency,
          is_newborn: formData.pt_info.is_newborn,
          linked_parent_id: formData.pt_info.linked_parent_id,
          birth_time: formData.pt_info.birth_time,
          delivery_type: formData.pt_info.delivery_type,
          gestational_age_weeks: formData.pt_info.gestational_age_weeks
            ? parseInt(formData.pt_info.gestational_age_weeks as string)
            : null,
        },
        next_of_kin: {
          full_name: formData.pt_info.nok_full_name,
          relationship: formData.pt_info.nok_relationship,
          phone: formData.pt_info.nok_phone,
          alternate_phone: formData.pt_info.nok_alternate_phone,
          address: formData.pt_info.nok_address,
        },
        medical_profile: {
          blood_group: formData.medical_profile.blood_group,
          genotype: formData.medical_profile.genotype,
          known_allergies: formData.medical_profile.known_allergies,
          chronic_conditions: formData.medical_profile.chronic_conditions,
          disability_notes: formData.medical_profile.disability_notes || null,
          special_alerts: formData.medical_profile.special_alerts,
        },
        emergency_contacts: formData.emergency_contacts.map((ec) => ({
          full_name: ec.full_name,
          relationship: ec.relationship,
          phone: ec.phone,
          alternate_phone: ec.alternate_phone,
          address: ec.address,
          is_primary: ec.is_primary ? 1 : 0,
        })),
        payer: {
          payer_type: formData.payer.payer_type,
          payer_id: formData.payer.payer_id,
        },
        referral: formData.referral,
        disclosure_consent: formData.disclosure_consent,
        authorized_persons: formData.authorized_persons.filter((p) => p.full_name.trim() !== ""),
      };

      if (mrnFromUrl) {
        await patientService.updatePatient(mrnFromUrl, payloadData);
        notify("Patient profile successfully updated", "success");
        setIsEditMode(false);
      } else {
        const response = await patientService.registerPatient(payloadData);
        if (response && response.data && response.data.mrn) {
          setGeneratedMRN(response.data.mrn);
        } else {
          setGeneratedMRN("Generated");
        }
        setIsRegistered(true);
        notify("Registration committed to Master Index", "success");
      }
    } catch (err: any) {
      notify(err.response?.data?.message || "Submission failed", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updatePTInfo = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      pt_info: {
        ...prev.pt_info,
        [field]: (field === "is_emergency" || field === "is_newborn") ? (value === "true" || value === true) : value,
      },
    }));
  };

  const updateMedical = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      medical_profile: { ...prev.medical_profile, [field]: value },
    }));
  };

  const updateEmergency = (field: string, value: string) => {
    const contacts = [...formData.emergency_contacts];
    contacts[0] = { ...contacts[0], [field]: value };
    setFormData((prev) => ({ ...prev, emergency_contacts: contacts }));
  };

  const updateNextOfKin = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      pt_info: { ...prev.pt_info, [field]: value },
    }));
  };

  const handlePayerTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    const matched = payerTypes.find((t: any) => t.code === code);

    setFormData((prev) => ({
      ...prev,
      payer: { ...prev.payer, payer_type: code, payer_id: 0 },
    }));

    if (matched) {
      setSelectedPayerTypeId(matched.id);
      fetchPayersList(matched.id);
    } else {
      setSelectedPayerTypeId(null);
      setAvailablePayers([]);
    }
  };

  const updateReferral = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, referral: { ...prev.referral, [field]: value } }));
  };

  const toggleConsentPref = (field: string) => {
    setFormData((prev) => {
      let consent = { ...prev.disclosure_consent, [field]: !(prev.disclosure_consent as any)[field] };
      if (field === "pref_do_not_share" && consent.pref_do_not_share) {
        consent = {
          ...consent,
          pref_share_listed: false,
          pref_share_family: false,
          pref_share_caregiver: false,
          pref_discuss_present: false,
          pref_emergency_listed: false,
        };
      } else if (field !== "pref_do_not_share" && consent[field as keyof typeof consent]) {
        consent.pref_do_not_share = false;
      }
      return { ...prev, disclosure_consent: consent };
    });
  };

  const toggleConsentInfo = (field: string) => {
    setFormData((prev) => {
      let consent = { ...prev.disclosure_consent, [field]: !(prev.disclosure_consent as any)[field] };
      if (field === "info_all" && consent.info_all) {
        consent = {
          ...consent,
          info_diagnosis: true,
          info_test_results: true,
          info_treatment_plan: true,
          info_medication: true,
          info_surgical_procedures: true,
          info_progress_updates: true,
          info_discharge_plans: true,
          info_billing: true,
        };
      } else if (field !== "info_all" && !consent[field as keyof typeof consent]) {
        consent.info_all = false;
      }
      return { ...prev, disclosure_consent: consent };
    });
  };

  const updateAuthPerson = (index: number, field: string, value: string) => {
    const list = [...formData.authorized_persons];
    list[index] = { ...list[index], [field]: value };
    setFormData((prev) => ({ ...prev, authorized_persons: list }));
  };

  if (isLoadingPatient) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 size={48} className="animate-spin text-brand-primary mx-auto" />
          <p className="text-sm font-black text-slate-400 uppercase tracking-widest">
            Retrieving Secure Index...
          </p>
        </div>
      </div>
    );
  }

  if (isRegistered) {
    return (
      <div className="max-w-2xl mx-auto py-10 animate-in zoom-in-95 duration-500">
        <div className="bg-white rounded-[48px] border border-slate-200 shadow-2xl p-12 text-center">
          <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-[32px] flex items-center justify-center mx-auto mb-8 border border-emerald-100 shadow-inner">
            <CheckCircle2 size={48} />
          </div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tight leading-none">
            Enrollment Successful
          </h2>

          <div className="my-8 p-6 bg-slate-50 border border-slate-200 rounded-3xl">
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-2">
              Patient Registration Number (MRN)
            </p>
            <p className="text-5xl font-black text-brand-primary font-mono tracking-tight">
              {generatedMRN}
            </p>
            <p className="text-slate-400 font-medium text-sm mt-3">
              Please provide this number to the patient for all future hospital visits.
            </p>
          </div>

          <p className="text-slate-500 font-medium text-lg leading-relaxed">
            Patient{" "}
            <span className="text-slate-900 font-black italic">
              {formData.pt_info.first_name} {formData.pt_info.last_name}
            </span>{" "}
            has been successfully provisioned in the system.
          </p>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => window.open(`/print/patient-card/${generatedMRN}`, "_blank")}
              className="flex items-center justify-center gap-3 px-8 py-5 bg-teal-600 text-white rounded-[24px] font-black uppercase text-xs tracking-widest hover:bg-teal-700 transition-all shadow-xl shadow-teal-100"
            >
              <Printer size={20} /> Print Patient ID
            </button>
            <button
              onClick={() => navigate("/patients/search")}
              className="flex items-center justify-center gap-3 px-8 py-5 bg-slate-900 text-white rounded-[24px] font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all shadow-xl active:scale-95"
            >
              Return to Search <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isEmergency = formData.pt_info.is_emergency;
  const isNewborn = formData.pt_info.is_newborn;

  return (
    <div className="w-full min-h-screen bg-slate-50/50 animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white border border-slate-200 overflow-hidden flex flex-col pt-6 min-h-full">
        {/* Header Block */}
        <div className="px-10 flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div
                className={`w-16 h-16 rounded-full overflow-hidden border-2 ${
                  dragActive ? "border-brand-primary bg-brand-active" : "border-slate-200"
                } flex items-center justify-center bg-slate-50 transition-all shadow-sm`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
              >
                {formData.pt_info.photo_url ? (
                  <img
                    src={formData.pt_info.photo_url}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserPlus size={24} className="text-slate-400" />
                )}

                {isEditMode && (
                  <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all rounded-full gap-1">
                    <label
                      className="p-1.5 bg-brand-primary text-white rounded-full hover:bg-brand-primary cursor-pointer"
                      title="Upload"
                    >
                      <UploadCloud size={12} />
                      <input
                        type="file"
                        className="hidden"
                        onChange={handlePhotoUpload}
                        accept="image/*"
                        disabled={!isEditMode}
                      />
                    </label>
                    <button
                      onClick={startCamera}
                      disabled={!isEditMode}
                      className="p-1.5 bg-slate-700 text-white rounded-full hover:bg-slate-600"
                      title="Camera"
                    >
                      <Camera size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-row">
              {/* Title Area */}
              <div>
                <h2 className="font-semibold text-slate-800">
                  {mrnFromUrl ? "Patient Profile" : "Demographics"}
                </h2>
                <p className="text-xs font-medium text-slate-500 mt-1">
                  {mrnFromUrl ? `Viewing record · ` : `New patient · `}
                  Date: {new Date().toLocaleDateString("en-GB")}
                </p>
              </div>

              {/* Quick MRN Search Bar */}
              <form
                onSubmit={handleSearchSubmit}
                className="mt-3 flex items-center bg-slate-50 border border-slate-200 px-2 py-1 shadow-inner focus-within:border-brand-primary focus-within:ring-2 focus-within:ring-brand-primary/20 transition-all w-fit"
              >
                <input
                  type="text"
                  placeholder="MRN..."
                  maxLength={6}
                  className="bg-transparent border-none outline-none text-xs font-bold text-slate-700 w-20 px-2 py-1.5 placeholder-slate-400"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  disabled={isSubmitting || isLoadingPatient}
                />
                <button
                  type="submit"
                  disabled={!searchInput.trim() || isSubmitting || isLoadingPatient}
                  className="bg-brand-primary text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-full hover:bg-brand-active hover:text-brand-primary transition-colors disabled:opacity-50"
                >
                  <Search size={16} className="text-slate-400" />
                </button>
              </form>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {mrnFromUrl && (
              <>
                <div className="flex gap-2 mr-2">
                  <button
                    onClick={() => window.open(`/print/patient-card/${mrnFromUrl}`, "_blank")}
                    className="bg-white border border-slate-200 text-slate-600 hover:text-[#2d258a] px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
                  >
                    <Printer size={14} /> Patient Card
                  </button>
                  <button
                    onClick={() => window.open(`/print/demographics/${mrnFromUrl}`, "_blank")}
                    className="bg-[#2d258a] text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-[#2d258a]/90 transition-all shadow-sm"
                  >
                    <FileText size={14} /> Demographics Sheet
                  </button>
                </div>
                <div className="px-4 py-2 bg-brand-active border border-brand-active rounded-xl">
                  <p className="text-[10px] font-black text-brand-primary uppercase tracking-widest">
                    Medical Record Number
                  </p>
                  <p className="text-sm font-black text-brand-primary font-mono tracking-wider">
                    {mrnFromUrl}
                  </p>
                </div>
              </>
            )}

            {!mrnFromUrl && (
              <>
                <button
                  onClick={() => window.open("/print/registration", "_blank")}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl text-[11px] font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-brand-primary transition-all shadow-sm"
                >
                  <Printer size={14} /> Print form
                </button>
                <label className="flex items-center gap-3 cursor-pointer bg-rose-50 px-6 py-3 rounded-2xl text-[11px] font-bold text-rose-800 border border-slate-200 hover:bg-rose-100 transition-all">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded-lg border-rose-300 text-rose-600 focus:ring-rose-600 transition-all"
                    checked={formData.pt_info.is_emergency}
                    onChange={(e) => updatePTInfo("is_emergency", e.target.checked)}
                    disabled={!isEditMode}
                  />
                  Emergency enroll
                </label>
                <label className="flex items-center gap-3 cursor-pointer bg-sky-50 px-6 py-3 rounded-2xl text-[11px] font-bold text-sky-800 border border-slate-200 hover:bg-sky-100 transition-all">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded-lg border-sky-300 text-sky-600 focus:ring-sky-600 transition-all"
                    checked={formData.pt_info.is_newborn}
                    onChange={(e) => updatePTInfo("is_newborn", e.target.checked)}
                    disabled={!isEditMode}
                  />
                  Newborn enroll
                </label>
              </>
            )}

            {!isEditMode ? (
              <button
                onClick={() => setIsEditMode(true)}
                className="bg-slate-900 text-white px-8 py-4 rounded-[24px] text-[11px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-slate-800 transition-all shadow-xl active:scale-95"
              >
                <Edit3 size={18} /> Enable Editing
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-brand-primary text-white px-10 py-4 rounded-[24px] text-[11px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-brand-primary transition-all shadow-xl shadow-brand-active disabled:opacity-50 active:scale-95"
              >
                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {isSubmitting ? "Processing..." : mrnFromUrl ? "Update Record" : "Finalize"}
              </button>
            )}
          </div>
        </div>

        <fieldset disabled={!isEditMode} className="px-6 w-full flex-1 flex flex-col">
          {/* CAMERA MODAL */}
          {isCameraOpen && (
            <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-white rounded-[40px] overflow-hidden shadow-2xl w-full max-w-2xl border-4 border-white">
                <div className="relative aspect-video bg-black">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  <div className="absolute inset-0 border-2 border-dashed border-white/30 pointer-events-none m-8 rounded-3xl" />
                </div>
                <div className="p-8 flex items-center justify-between bg-white">
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="w-16 h-16 bg-brand-primary rounded-full flex items-center justify-center text-white shadow-xl shadow-brand-active hover:scale-110 transition-transform active:scale-95"
                  >
                    <Camera size={32} />
                  </button>
                  <div className="w-20" />
                </div>
              </div>
            </div>
          )}

          {/* ===================== ROW 1: DEMOGRAPHICS (ALWAYS VISIBLE) ===================== */}
          <div className="grid grid-cols-12 gap-6 mb-6 shrink-0">
            {/* COL 1 — Personal Information */}
            <div className="col-span-12 md:col-span-4 bg-brand-active/30 rounded-3xl p-6 border border-brand-active shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 bg-brand-primary rounded-full"></div>
                  <h3 className="text-sm font-black text-slate-800">Personal information</h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {/* First Name */}
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold text-slate-500 ml-0.5">First name *</label>
                    <input
                      type="text"
                      className={`w-full px-2 py-1.5 bg-white border rounded text-xs font-bold outline-none focus:border-brand-primary ${
                        errors.first_name ? "border-red-400" : "border-slate-200"
                      }`}
                      value={formData.pt_info.first_name || ""}
                      onChange={(e) => updatePTInfo("first_name", e.target.value)}
                    />
                  </div>
                  {/* Middle Name */}
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold text-slate-500 ml-0.5">Middle name</label>
                    <input
                      type="text"
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold outline-none focus:border-brand-primary"
                      value={formData.pt_info.middle_name || ""}
                      onChange={(e) => updatePTInfo("middle_name", e.target.value)}
                    />
                  </div>
                  {/* Last Name */}
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold text-slate-500 ml-0.5">Last name *</label>
                    <input
                      type="text"
                      className={`w-full px-2 py-1.5 bg-white border rounded text-xs font-bold outline-none focus:border-brand-primary ${
                        errors.last_name ? "border-red-400" : "border-slate-200"
                      }`}
                      value={formData.pt_info.last_name || ""}
                      onChange={(e) => updatePTInfo("last_name", e.target.value)}
                    />
                  </div>
                  {/* Gender */}
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold text-slate-500 ml-0.5">Gender {!isEmergency && !isNewborn && '*'}</label>
                    <select
                      className={`w-full px-2 py-1.5 bg-white border rounded text-xs font-bold outline-none ${
                        errors.gender ? "border-red-400" : "border-slate-200"
                      }`}
                      value={formData.pt_info.gender || ""}
                      onChange={(e) => updatePTInfo("gender", e.target.value)}
                    >
                      <option value="">—</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  {/* DOB */}
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold text-slate-500 ml-0.5">Date of birth {!isEmergency && !isNewborn && '*'}</label>
                    <input
                      type="date"
                      className={`w-full px-2 py-1.5 bg-white border rounded text-xs font-bold outline-none ${
                        errors.dob ? "border-red-400" : "border-slate-200"
                      }`}
                      value={formData.pt_info.date_of_birth || ""}
                      onChange={(e) => updatePTInfo("date_of_birth", e.target.value)}
                    />
                  </div>
                  {/* Age */}
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold text-slate-500 ml-0.5">Age (Y-M-D)</label>
                    <div className="w-full px-2 py-1.5 bg-slate-100 border border-slate-100 rounded text-xs font-black text-brand-primary flex items-center min-h-[30px]">
                      {calculateAge(formData.pt_info.date_of_birth) || "—"}
                    </div>
                  </div>
                  {/* Marital Status */}
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold text-slate-500 ml-0.5">Marital status</label>
                    <select
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold outline-none"
                      value={formData.pt_info.marital_status || ""}
                      onChange={(e) => updatePTInfo("marital_status", e.target.value)}
                    >
                      <option value="">—</option>
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Divorced">Divorced</option>
                      <option value="Widowed">Widowed</option>
                    </select>
                  </div>
                  {/* Nationality */}
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold text-slate-500 ml-0.5">Nationality</label>
                    <SearchableSelect
                      options={countries.map((c) => c.name)}
                      value={formData.pt_info.nationality}
                      onChange={handleCountryChange}
                      placeholder="Select Country"
                      disabled={!isEditMode}
                    />
                  </div>
                  {/* State */}
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold text-slate-500 ml-0.5">State of origin</label>
                    {locationData[formData.pt_info.nationality] ? (
                      <SearchableSelect
                        options={Object.keys(locationData[formData.pt_info.nationality])}
                        value={formData.pt_info.state_of_origin}
                        onChange={handleStateChange}
                        placeholder="Select State"
                        disabled={!isEditMode}
                      />
                    ) : (
                      <input
                        type="text"
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold outline-none focus:border-brand-primary"
                        value={formData.pt_info.state_of_origin}
                        onChange={(e) => handleStateChange(e.target.value)}
                        disabled={!isEditMode}
                      />
                    )}
                  </div>
                  {/* LGA */}
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold text-slate-500 ml-0.5">LGA / City</label>
                    {locationData[formData.pt_info.nationality]?.[formData.pt_info.state_of_origin] ? (
                      <SearchableSelect
                        options={
                          locationData[formData.pt_info.nationality][formData.pt_info.state_of_origin]
                        }
                        value={formData.pt_info.lga}
                        onChange={(val) => updatePTInfo("lga", val)}
                        placeholder="Select LGA"
                        disabled={!isEditMode || !formData.pt_info.state_of_origin}
                      />
                    ) : (
                      <input
                        type="text"
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold outline-none focus:border-brand-primary"
                        value={formData.pt_info.lga}
                        onChange={(e) => updatePTInfo("lga", e.target.value)}
                        disabled={!isEditMode}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* DYNAMIC NEWBORN SECTION */}
              {formData.pt_info.is_newborn && (
                <div className="mt-4 pt-4 border-t border-brand-active/50 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-4 bg-sky-500 rounded-full"></div>
                    <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-wider">Birth Details</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-0.5 col-span-2 relative">
                      <label className="text-[10px] font-bold text-slate-500 ml-0.5 flex justify-between">
                        <span>Mother's MRN (Link) *</span>
                        <span className="text-slate-400 font-normal">Press Enter to fetch</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="e.g. 100001"
                          className={`w-full px-2 py-1.5 pr-8 bg-white border rounded text-xs font-bold outline-none focus:border-brand-primary ${
                            errors.linked_parent_id ? "border-red-400" : "border-slate-200"
                          }`}
                          value={formData.pt_info.linked_parent_id || ""}
                          onChange={(e) => updatePTInfo("linked_parent_id", e.target.value)}
                          onKeyDown={handleMotherMRNKeyDown}
                          disabled={isFetchingMother}
                        />
                        {isFetchingMother ? (
                          <Loader2 size={14} className="absolute right-2 top-2 animate-spin text-slate-400" />
                        ) : (
                          <Search 
                            size={14} 
                            className="absolute right-2 top-2 text-slate-400 cursor-pointer hover:text-brand-primary" 
                            onClick={() => fetchMotherDetails(formData.pt_info.linked_parent_id)}
                          />
                        )}
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[10px] font-bold text-slate-500 ml-0.5">Time of Birth</label>
                      <input
                        type="time"
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold outline-none focus:border-brand-primary"
                        value={formData.pt_info.birth_time || ""}
                        onChange={(e) => updatePTInfo("birth_time", e.target.value)}
                      />
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[10px] font-bold text-slate-500 ml-0.5">Delivery Type</label>
                      <select
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold outline-none focus:border-brand-primary"
                        value={formData.pt_info.delivery_type || ""}
                        onChange={(e) => updatePTInfo("delivery_type", e.target.value)}
                      >
                        <option value="">—</option>
                        <option value="Vaginal">Vaginal</option>
                        <option value="Cesarean">Cesarean</option>
                        <option value="Assisted Vaginal">Assisted Vaginal</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[10px] font-bold text-slate-500 ml-0.5">Gestational Age (wks)</label>
                      <input
                        type="number"
                        min="20" max="45"
                        placeholder="e.g. 39"
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold outline-none focus:border-brand-primary"
                        value={formData.pt_info.gestational_age_weeks || ""}
                        onChange={(e) => updatePTInfo("gestational_age_weeks", e.target.value)}
                      />
                    </div>
                    <div className="col-span-2 mt-2 bg-sky-50 border border-sky-100 rounded-lg p-2 flex items-start gap-2">
                       <Baby className="text-sky-500 shrink-0" size={16} />
                       <p className="text-[10px] font-semibold text-sky-700 leading-tight">
                         Press Enter on the Mother's MRN field above to auto-fill address, next of kin, and contact data instantly.
                       </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* COL 2 — Contact Information */}
            <div className="col-span-12 md:col-span-4">
              <div className="bg-indigo-50/30 rounded-3xl p-4 border border-slate-200 h-full">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-5 bg-indigo-600 rounded-md flex items-center justify-center">
                    <Phone className="text-white" size={12} />
                  </div>
                  <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest">
                    Contact information
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="col-span-2 space-y-0.5">
                    <label className="text-[10px] font-bold text-slate-500 ml-0.5">
                      Phone number {!isEmergency && !isNewborn && '*'}
                    </label>
                    <input
                      type="tel"
                      className={`w-full px-2 py-1.5 bg-white border rounded text-xs font-bold outline-none focus:border-brand-primary ${
                        errors.phone ? "border-red-400" : "border-slate-200"
                      }`}
                      value={formData.pt_info.phone || ""}
                      onChange={(e) =>
                        handlePhoneInput(e.target.value, (val) => updatePTInfo("phone", val))
                      }
                    />
                  </div>
                  <div className="col-span-2 space-y-0.5">
                    <label className="text-[10px] font-bold text-slate-500 ml-0.5">
                      Email address
                    </label>
                    <input
                      type="email"
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold outline-none focus:border-brand-primary"
                      value={formData.pt_info.email || ""}
                      onChange={(e) => updatePTInfo("email", e.target.value)}
                    />
                  </div>
                  <div className="col-span-2 space-y-0.5">
                    <label className="text-[10px] font-bold text-slate-500 ml-0.5">
                      Residential address {!isEmergency && !isNewborn && '*'}
                    </label>
                    <input
                      type="text"
                      className={`w-full px-2 py-1.5 bg-white border rounded text-xs font-bold outline-none focus:border-brand-primary ${
                        errors.address ? "border-red-400" : "border-slate-200"
                      }`}
                      value={formData.pt_info.address || ""}
                      onChange={(e) => updatePTInfo("address", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* COL 3 — Next of Kin */}
            <div className="col-span-12 md:col-span-4">
              <div className="bg-indigo-50/30 rounded-3xl p-4 border border-slate-200 h-full">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 bg-indigo-600 rounded-full"></div>
                  <h3 className="text-sm font-black text-slate-800">Next of kin</h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2 space-y-0.5">
                    <label className="text-[10px] font-bold text-slate-500 ml-0.5">
                      Full name {!isEmergency && !isNewborn && '*'}
                    </label>
                    <input
                      type="text"
                      className={`w-full px-2 py-1.5 bg-white border rounded text-xs font-bold outline-none focus:border-brand-primary ${
                        errors.next_of_kin_name ? "border-red-400" : "border-slate-200"
                      }`}
                      value={formData.pt_info.nok_full_name || ""}
                      onChange={(e) => updateNextOfKin("nok_full_name", e.target.value)}
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold text-slate-500 ml-0.5">
                      Relationship
                    </label>
                    <input
                      type="text"
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold outline-none focus:border-brand-primary"
                      value={formData.pt_info.nok_relationship || ""}
                      onChange={(e) => updateNextOfKin("nok_relationship", e.target.value)}
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold text-slate-500 ml-0.5">Phone {!isEmergency && !isNewborn && '*'}</label>
                    <input
                      type="tel"
                      className={`w-full px-2 py-1.5 bg-white border rounded text-xs font-bold outline-none focus:border-brand-primary ${
                        errors.next_of_kin_phone ? "border-red-400" : "border-slate-200"
                      }`}
                      value={formData.pt_info.nok_phone || ""}
                      onChange={(e) =>
                        handlePhoneInput(e.target.value, (val) =>
                          updateNextOfKin("nok_phone", val)
                        )
                      }
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold text-slate-500 ml-0.5">
                      Alt. phone
                    </label>
                    <input
                      type="tel"
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold outline-none focus:border-brand-primary"
                      value={formData.pt_info.nok_alternate_phone || ""}
                      onChange={(e) =>
                        handlePhoneInput(e.target.value, (val) =>
                          updateNextOfKin("nok_alternate_phone", val)
                        )
                      }
                    />
                  </div>
                  <div className="col-span-2 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-500 ml-0.5">Address</label>
                      <button
                        type="button"
                        onClick={() => updateNextOfKin("nok_address", formData.pt_info.address)}
                        className="text-[8px] font-black text-indigo-500 uppercase hover:text-indigo-700 transition-colors"
                      >
                        Same as patient
                      </button>
                    </div>
                    <input
                      type="text"
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold outline-none focus:border-brand-primary"
                      value={formData.pt_info.nok_address || ""}
                      onChange={(e) => updateNextOfKin("nok_address", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ===================== TAB BAR FOR ROW 2 ===================== */}
          <div className="flex items-center gap-2 border-b-2 border-slate-100 mb-6 shrink-0 mt-4 px-2">
            <button
              type="button"
              onClick={() => setActiveBottomTab("clinical")}
              className={`px-8 py-3.5 text-[11px] font-black uppercase tracking-widest transition-all rounded-t-xl ${
                activeBottomTab === "clinical"
                  ? "border-b-4 border-rose-600 text-rose-700 bg-rose-50/50"
                  : "border-b-4 border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              }`}
            >
              Emergency & Clinical Data
            </button>
            <button
              type="button"
              onClick={() => setActiveBottomTab("consent")}
              className={`px-8 py-3.5 text-[11px] font-black uppercase tracking-widest transition-all rounded-t-xl ${
                activeBottomTab === "consent"
                  ? "border-b-4 border-rose-600 text-rose-700 bg-rose-50/50"
                  : "border-b-4 border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              }`}
            >
              Acquisition & NDPA Consents
            </button>
          </div>

          {/* ===================== ROW 2 ===================== */}
          <div className="flex-1 overflow-y-auto hide-scrollbar pb-6 px-1">
            {/* --- TAB 1 CONTENT: CLINICAL & EMERGENCY --- */}
            {activeBottomTab === "clinical" && (
              <div className="grid grid-cols-12 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* COL 1 — Emergency Contact */}
                <div className="col-span-12 md:col-span-4 bg-[#FAFAFA] rounded-3xl p-6 border border-[#EEEDFE]">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-5 bg-brand-primary rounded-full"></div>
                    <h3 className="text-sm font-black text-slate-800">Emergency contact</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <div className="col-span-2 space-y-0.5">
                      <label className="text-[10px] font-bold text-slate-500 ml-0.5">
                        Full name {!isEmergency && !isNewborn && '*'}
                      </label>
                      <input
                        type="text"
                        className={`w-full px-2 py-1.5 bg-white border rounded text-xs font-bold outline-none focus:border-brand-primary ${
                          errors.emergency_contact_name ? "border-red-400" : "border-slate-200"
                        }`}
                        value={formData.emergency_contacts[0].full_name || ""}
                        onChange={(e) => updateEmergency("full_name", e.target.value)}
                      />
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[10px] font-bold text-slate-500 ml-0.5">
                        Relationship
                      </label>
                      <input
                        type="text"
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold outline-none focus:border-brand-primary"
                        value={formData.emergency_contacts[0].relationship || ""}
                        onChange={(e) => updateEmergency("relationship", e.target.value)}
                      />
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[10px] font-bold text-slate-500 ml-0.5">Phone {!isEmergency && !isNewborn && '*'}</label>
                      <input
                        type="tel"
                        className={`w-full px-2 py-1.5 bg-white border rounded text-xs font-bold outline-none focus:border-brand-primary ${
                          errors.emergency_contact_phone ? "border-red-400" : "border-slate-200"
                        }`}
                        value={formData.emergency_contacts[0].phone || ""}
                        onChange={(e) =>
                          handlePhoneInput(e.target.value, (val) => updateEmergency("phone", val))
                        }
                      />
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[10px] font-bold text-slate-500 ml-0.5">
                        Alt. phone
                      </label>
                      <input
                        type="tel"
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold outline-none focus:border-brand-primary"
                        value={formData.emergency_contacts[0].alternate_phone || ""}
                        onChange={(e) =>
                          handlePhoneInput(e.target.value, (val) =>
                            updateEmergency("alternate_phone", val)
                          )
                        }
                      />
                    </div>
                    <div className="col-span-2 space-y-0.5">
                      <label className="text-[10px] font-bold text-slate-500 ml-0.5">Address</label>
                      <input
                        type="text"
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold outline-none focus:border-brand-primary"
                        value={formData.emergency_contacts[0].address || ""}
                        onChange={(e) => updateEmergency("address", e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* COL 2 — Payer Information */}
                <div className="col-span-12 md:col-span-4 bg-[#FAFAFA] rounded-3xl p-6 border border-[#EEEDFE]">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-5 bg-brand-primary rounded-full"></div>
                    <h3 className="text-sm font-black text-slate-800">Payer information</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <div className="space-y-0.5">
                      <label className="text-[10px] font-bold text-slate-500 ml-0.5">
                        Payer type {!isEmergency && !isNewborn && '*'}
                      </label>
                      <select
                        className={`w-full px-2 py-1.5 bg-white border rounded text-xs font-black outline-none ${
                          errors.payer_type ? "border-red-400" : "border-slate-200"
                        }`}
                        value={formData.payer.payer_type || ""}
                        onChange={handlePayerTypeChange}
                      >
                        <option value="">Select type</option>
                        {payerTypes.map((t) => (
                          <option key={t.id} value={t.code}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[10px] font-bold text-slate-500 ml-0.5">
                        Policy number
                      </label>
                      <input
                        type="text"
                        placeholder="Optional"
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold outline-none focus:border-brand-primary"
                        value={formData.payer.policy_number || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            payer: {
                              ...formData.payer,
                              policy_number: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                    <div className="col-span-2 space-y-0.5">
                      <label className="text-[10px] font-bold text-slate-500 ml-0.5">
                        Provider / payer {!isEmergency && !isNewborn && '*'}
                      </label>
                      <select
                        disabled={!formData.payer.payer_type || loadingPayers}
                        className={`w-full px-2 py-1.5 bg-white border rounded text-xs font-black outline-none ${
                          errors.payer_id ? "border-red-400" : "border-slate-200"
                        }`}
                        value={formData.payer.payer_id || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            payer: {
                              ...formData.payer,
                              payer_id: parseInt(e.target.value),
                            },
                          })
                        }
                      >
                        <option value="">
                          {loadingPayers ? "Loading..." : "Select provider"}
                        </option>
                        {availablePayers.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* COL 3 — Medical Info */}
                <div className="col-span-12 md:col-span-4 bg-[#FAFAFA] rounded-3xl p-6 border border-[#EEEDFE]">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-5 bg-brand-primary rounded-full"></div>
                    <h3 className="text-sm font-black text-slate-800">Medical info</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <div className="space-y-0.5">
                      <label className="text-[10px] font-bold text-slate-500 ml-0.5">
                        Blood group
                      </label>
                      <select
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold outline-none"
                        value={formData.medical_profile.blood_group || ""}
                        onChange={(e) => updateMedical("blood_group", e.target.value)}
                      >
                        <option value="">—</option>
                        {["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"].map((bg) => (
                          <option key={bg}>{bg}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[10px] font-bold text-slate-500 ml-0.5">Genotype</label>
                      <select
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold outline-none"
                        value={formData.medical_profile.genotype || ""}
                        onChange={(e) => updateMedical("genotype", e.target.value)}
                      >
                        <option value="">—</option>
                        {["AA", "AS", "SS", "AC", "SC"].map((g) => (
                          <option key={g}>{g}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2 space-y-0.5">
                      <label className="text-[10px] font-bold text-slate-500 ml-0.5">
                        Known allergies
                      </label>
                      <input
                        type="text"
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 focus:border-brand-primary rounded-lg text-xs"
                        placeholder="None"
                        value={formData.medical_profile.known_allergies || ""}
                        onChange={(e) => updateMedical("known_allergies", e.target.value)}
                      />
                    </div>
                    <div className="col-span-2 space-y-0.5">
                      <label className="text-[10px] font-bold text-slate-500 ml-0.5">
                        Chronic conditions
                      </label>
                      <input
                        type="text"
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 focus:border-brand-primary rounded-lg text-xs"
                        placeholder="None"
                        value={formData.medical_profile.chronic_conditions || ""}
                        onChange={(e) => updateMedical("chronic_conditions", e.target.value)}
                      />
                    </div>
                    <div className="col-span-2 space-y-0.5">
                      <label className="text-[10px] font-bold text-slate-500 ml-0.5">
                        Special alerts
                      </label>
                      <textarea
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-brand-primary h-10 resize-none"
                        placeholder="None"
                        value={formData.medical_profile.special_alerts || ""}
                        onChange={(e) => updateMedical("special_alerts", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* --- TAB 2 CONTENT: MARKETING & NDPA CONSENT --- */}
            {activeBottomTab === "consent" && (
              <div className="grid grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Acquisition Tracking */}
                <div className="col-span-12 md:col-span-4 bg-amber-50/50 p-6 rounded-3xl border border-amber-200/70 shadow-sm h-min">
                  <div className="flex items-center gap-3 mb-6 border-b border-amber-200/40 pb-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0">
                      <Target size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-800">Acquisition Tracking</h3>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Record hospital discovery channel.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600">
                        Referral Channel *
                      </label>
                      <select
                        className="w-full mt-1 px-3 py-2.5 bg-white border border-amber-200 rounded-xl text-xs font-bold outline-none"
                        value={formData.referral.referral_source_id}
                        onChange={(e) =>
                          updateReferral("referral_source_id", parseInt(e.target.value))
                        }
                      >
                        {referralSources.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {activeReferralCode === "DOCTOR_REFERRAL" && (
                      <div>
                        <label className="text-[10px] font-bold text-slate-600">
                          Referring Physician Name
                        </label>
                        <input
                          type="text"
                          placeholder="Dr. Full Name"
                          className="w-full mt-1 px-3 py-2.5 bg-white border border-amber-200 rounded-xl text-xs font-semibold"
                          value={formData.referral.referring_doctor_name}
                          onChange={(e) => updateReferral("referring_doctor_name", e.target.value)}
                        />
                      </div>
                    )}

                    {(activeReferralCode === "HOSPITAL_FACILITY" ||
                      activeReferralCode === "DOCTOR_REFERRAL") && (
                      <div>
                        <label className="text-[10px] font-bold text-slate-600">
                          Referring Facility / Hospital
                        </label>
                        <input
                          type="text"
                          placeholder="Clinic / Center Name"
                          className="w-full mt-1 px-3 py-2.5 bg-white border border-amber-200 rounded-xl text-xs font-semibold"
                          value={formData.referral.referring_facility_name}
                          onChange={(e) =>
                            updateReferral("referring_facility_name", e.target.value)
                          }
                        />
                      </div>
                    )}

                    {activeReferralCode === "FAMILY_FRIEND" && (
                      <div>
                        <label className="text-[10px] font-bold text-slate-600">
                          Referred by (Name / MRN)
                        </label>
                        <input
                          type="text"
                          placeholder="Name or Patient MRN"
                          className="w-full mt-1 px-3 py-2.5 bg-white border border-amber-200 rounded-xl text-xs font-semibold"
                          value={formData.referral.referred_by_name}
                          onChange={(e) => updateReferral("referred_by_name", e.target.value)}
                        />
                      </div>
                    )}

                    {activeReferralCode === "SOCIAL_MEDIA" && (
                      <div>
                        <label className="text-[10px] font-bold text-slate-600">
                          Platform / Channel
                        </label>
                        <input
                          type="text"
                          placeholder="E.g. Instagram, Facebook, LinkedIn"
                          className="w-full mt-1 px-3 py-2.5 bg-white border border-amber-200 rounded-xl text-xs font-semibold"
                          value={formData.referral.referral_channel_detail}
                          onChange={(e) =>
                            updateReferral("referral_channel_detail", e.target.value)
                          }
                        />
                      </div>
                    )}

                    <div>
                      <label className="text-[10px] font-bold text-slate-600">
                        Campaign / Promo Code
                      </label>
                      <input
                        type="text"
                        placeholder="Optional Code"
                        className="w-full mt-1 px-3 py-2.5 bg-white border border-amber-200 rounded-xl text-xs font-semibold"
                        value={formData.referral.campaign_code}
                        onChange={(e) => updateReferral("campaign_code", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600">
                        Attribution Notes
                      </label>
                      <input
                        type="text"
                        placeholder="Additional context"
                        className="w-full mt-1 px-3 py-2.5 bg-white border border-amber-200 rounded-xl text-xs font-semibold"
                        value={formData.referral.notes}
                        onChange={(e) => updateReferral("notes", e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* NDPA Consent Form */}
                <div className="col-span-12 md:col-span-8 bg-slate-50/80 p-6 rounded-3xl border border-slate-200 flex flex-col justify-between shadow-sm">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-4 mb-5 gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <ShieldCheck size={22} />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-800">
                          Information Sharing Consent Form
                        </h3>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Governed under NDPA. Patients may revoke preferences in writing.
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full border border-emerald-200 shrink-0">
                      NDPA 2023 Standard
                    </span>
                  </div>

                  <div className="grid grid-cols-12 gap-5 mb-5">
                    {/* Preferences & Shareable Data */}
                    <div className="col-span-12 lg:col-span-5 flex flex-col gap-4">
                      {/* Section B */}
                      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex-1">
                        <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3">
                          Your Disclosure Preference
                        </h4>
                        <div className="space-y-2.5">
                          {[
                            {
                              key: "pref_do_not_share",
                              label: "Do NOT share my medical information with anyone.",
                            },
                            {
                              key: "pref_share_listed",
                              label: "Share my medical info only with the person(s) listed below.",
                            },
                            {
                              key: "pref_share_family",
                              label: "Share my medical information with immediate family members.",
                            },
                            {
                              key: "pref_share_caregiver",
                              label: "Share my medical information with my caregiver(s).",
                            },
                            {
                              key: "pref_discuss_present",
                              label: "Discuss my medical information only when I am present.",
                            },
                            {
                              key: "pref_emergency_listed",
                              label: "In an emergency, share info with person(s) listed below.",
                            },
                          ].map((item) => (
                            <label
                              key={item.key}
                              className="flex items-start gap-2.5 cursor-pointer group"
                            >
                              <input
                                type="checkbox"
                                className="mt-0.5 rounded text-brand-primary focus:ring-brand-primary"
                                checked={(formData.disclosure_consent as any)[item.key]}
                                onChange={() => toggleConsentPref(item.key)}
                              />
                              <span className="text-[11px] font-semibold text-slate-600 group-hover:text-brand-primary transition-colors leading-snug">
                                {item.label}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Section D */}
                      <div className="bg-white p-4 rounded-2xl border border-slate-200">
                        <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3">
                          Information That May Be Shared
                        </h4>
                        <div className="grid grid-cols-2 gap-y-3 gap-x-2">
                          {[
                            { key: "info_diagnosis", label: "Diagnosis" },
                            { key: "info_test_results", label: "Test Results" },
                            { key: "info_treatment_plan", label: "Treatment Plan" },
                            { key: "info_medication", label: "Medications" },
                            { key: "info_surgical_procedures", label: "Surgeries" },
                            { key: "info_progress_updates", label: "Progress" },
                            { key: "info_discharge_plans", label: "Discharge Plans" },
                            { key: "info_billing", label: "Billing Info" },
                            { key: "info_all", label: "All of the Above", highlight: true },
                          ].map((info) => (
                            <label
                              key={info.key}
                              className="flex items-center gap-2 cursor-pointer group"
                            >
                              <input
                                type="checkbox"
                                className="rounded text-brand-primary focus:ring-brand-primary"
                                checked={(formData.disclosure_consent as any)[info.key]}
                                onChange={() => toggleConsentInfo(info.key)}
                              />
                              <span
                                className={`text-[10px] font-semibold group-hover:text-brand-primary ${
                                  info.highlight
                                    ? "text-brand-primary font-black"
                                    : "text-slate-600"
                                }`}
                              >
                                {info.label}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Section C: Authorised Persons */}
                    <div className="col-span-12 lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 flex flex-col">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                          <Users size={14} /> Authorised Persons (Up to 3 Individuals)
                        </h4>
                      </div>
                      <div className="space-y-4 flex-1">
                        {formData.authorized_persons.map((person, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200"
                          >
                            <p className="text-[11px] font-black text-brand-primary mb-2.5">
                              Authorised Person {idx + 1}
                            </p>
                            <div className="grid grid-cols-12 gap-3">
                              <div className="col-span-12">
                                <input
                                  type="text"
                                  placeholder="Full Legal Name"
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:border-brand-primary outline-none"
                                  value={person.full_name}
                                  onChange={(e) =>
                                    updateAuthPerson(idx, "full_name", e.target.value)
                                  }
                                />
                              </div>
                              <div className="col-span-6">
                                <input
                                  type="text"
                                  placeholder="Relationship (e.g. Spouse)"
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:border-brand-primary outline-none"
                                  value={person.relationship}
                                  onChange={(e) =>
                                    updateAuthPerson(idx, "relationship", e.target.value)
                                  }
                                />
                              </div>
                              <div className="col-span-6">
                                <input
                                  type="tel"
                                  placeholder="Phone Number"
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:border-brand-primary outline-none"
                                  value={person.phone}
                                  onChange={(e) =>
                                    handlePhoneInput(e.target.value, (val) =>
                                      updateAuthPerson(idx, "phone", val)
                                    )
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Section E: Patient Declaration & Signature Block */}
                  <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100 flex flex-col xl:flex-row items-center justify-between gap-6">
                    <div className="space-y-1.5 flex-1">
                      <p className="text-xs font-black text-slate-800">E · Patient Declaration</p>
                      <p className="text-[10px] text-slate-600 leading-relaxed max-w-lg">
                        "I confirm the preferences recorded above reflect my wishes. I understand
                        that I may withdraw or change this consent at any time by notifying
                        Gracespring Hospitals in writing."
                      </p>
                    </div>

                    {/* Signature Pad Integrations */}
                    <div className="flex flex-wrap gap-4 shrink-0">
                      {/* Patient Signature */}
                      <div className="flex flex-col gap-1 w-32 h-20 relative">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">
                          Patient Signature
                        </span>
                        <SignaturePad
                          className="bg-white border-2 border-emerald-200/60 rounded-xl overflow-hidden shadow-sm"
                          initialDataUrl={formData.disclosure_consent.patient_signature_data}
                          onEnd={(data) =>
                            setFormData((prev) => ({
                              ...prev,
                              disclosure_consent: {
                                ...prev.disclosure_consent,
                                patient_signature_data: data,
                                patient_signed: true,
                              },
                            }))
                          }
                          onClear={() =>
                            setFormData((prev) => ({
                              ...prev,
                              disclosure_consent: {
                                ...prev.disclosure_consent,
                                patient_signature_data: "",
                                patient_signed: false,
                              },
                            }))
                          }
                        />
                      </div>

                      {/* Staff/Witness Signature */}
                      <div className="flex flex-col gap-1 w-32 h-20 relative">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">
                          Witness Signature
                        </span>
                        <SignaturePad
                          className="bg-white border-2 border-emerald-200/60 rounded-xl overflow-hidden shadow-sm"
                          initialDataUrl={formData.disclosure_consent.witness_signature_data}
                          onEnd={(data) =>
                            setFormData((prev) => ({
                              ...prev,
                              disclosure_consent: {
                                ...prev.disclosure_consent,
                                witness_signature_data: data,
                                witness_signed: true,
                              },
                            }))
                          }
                          onClear={() =>
                            setFormData((prev) => ({
                              ...prev,
                              disclosure_consent: {
                                ...prev.disclosure_consent,
                                witness_signature_data: "",
                                witness_signed: false,
                              },
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <style
            dangerouslySetInnerHTML={{
              __html: `
            .hide-scrollbar::-webkit-scrollbar { display: none; }
            .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          `,
            }}
          />

          <canvas ref={canvasRef} className="hidden" />
        </fieldset>
      </div>
    </div>
  );
};

export default PatientRegistration;

// import React, { useState, useEffect, useRef } from "react";
// import { useNavigate, useSearchParams } from "react-router-dom";
// import {
//   ChevronRight,
//   CheckCircle2,
//   UserPlus,
//   Printer,
//   FileText,
//   Loader2,
//   Edit3,
//   Save,
//   Camera,
//   UploadCloud,
//   Phone,
//   Target,
//   ShieldCheck,
//   Users,
//   Search,
// } from "lucide-react";
// import { patientService } from "../services/patient.service";
// import { useNotification } from "../context/NotificationContext";

// // Import the custom components
// import SignaturePad from "./SignaturePad";
// import SearchableSelect from "./SearchableSelect";




// const countries = [
//   { name: "Nigeria", code: "NG", flag: "🇳🇬" },
//   { name: "Ghana", code: "GH", flag: "🇬🇭" },
//   { name: "Cameroon", code: "CM", flag: "🇨🇲" },
//   { name: "Kenya", code: "KE", flag: "🇰🇪" },
//   { name: "South Africa", code: "ZA", flag: "🇿🇦" },
//   { name: "Uganda", code: "UG", flag: "🇺🇬" },
//   { name: "Tanzania", code: "TZ", flag: "🇹🇿" },
//   { name: "Rwanda", code: "RW", flag: "🇷🇼" },
//   { name: "Ethiopia", code: "ET", flag: "🇪🇹" },
//   { name: "Senegal", code: "SN", flag: "🇸🇳" },
//   { name: "Côte d'Ivoire", code: "CI", flag: "🇨🇮" },
//   { name: "Egypt", code: "EG", flag: "🇪🇬" },
//   { name: "Morocco", code: "MA", flag: "🇲🇦" },
//   { name: "United States", code: "US", flag: "🇺🇸" },
//   { name: "United Kingdom", code: "GB", flag: "🇬🇧" },
//   { name: "Canada", code: "CA", flag: "🇨🇦" },
//   { name: "Australia", code: "AU", flag: "🇦🇺" },
//   { name: "India", code: "IN", flag: "🇮🇳" },
// ];

// const locationData: Record<string, Record<string, string[]>> = {
//   Nigeria: 
//   {
//     "Abia": [
//         "Aba North",
//         "Aba South",
//         "Arochukwu",
//         "Bende",
//         "Ikwuano",
//         "Isiala Ngwa North",
//         "Isiala Ngwa South",
//         "Isuikwuato",
//         "Obingwa",
//         "Ohafia",
//         "Osisioma",
//         "Ugwunagbo",
//         "Ukwa East",
//         "Ukwa West",
//         "Umuahia North",
//         "Umuahia South",
//         "Umu Nneochi"
//     ],
//     "Adamawa": [
//         "Madagali",
//         "Michika",
//         "Mubi North",
//         "Mubi South",
//         "Hong",
//         "Gombi",
//         "Song",
//         "Girei",
//         "Yola North",
//         "Yola South",
//         "Fufore",
//         "Mayo Belwa",
//         "Jada",
//         "Ganye",
//         "Toungo",
//         "Demsa",
//         "Numan",
//         "Lamurde",
//         "Guyuk",
//         "Shelleng",
//         "Maiha"
//     ],
//     "AkwaIbom": [
//         "Abak",
//         "Eastern Obolo",
//         "Eket",
//         "Esit Eket",
//         "Essien Udim",
//         "Etim Ekpo",
//         "Etinan",
//         "Ibeno",
//         "Ibesikpo Asutan",
//         "Ibiono-Ibom",
//         "Ika",
//         "Ikono",
//         "Ikot Abasi",
//         "Ikot Ekpene",
//         "Ini",
//         "Itu",
//         "Mbo",
//         "Mkpat-Enin",
//         "Nsit-Atai",
//         "Nsit-Ibom",
//         "Nsit-Ubium",
//         "Obot Akara",
//         "Okobo",
//         "Onna",
//         "Oron",
//         "Oruk Anam",
//         "Udung-Uko",
//         "Ukanafun",
//         "Uruan",
//         "Urue-Offong/Oruko",
//         "Uyo"
//     ],
//     "Anambra": [
//         "Aguata",
//         "Anambra East",
//         "Anambra West",
//         "Anaocha",
//         "Awka North",
//         "Awka South",
//         "Ayamelum",
//         "Dunukofia",
//         "Ekwusigo",
//         "Idemili North",
//         "Idemili South",
//         "Ihiala",
//         "Njikoka",
//         "Nnewi North",
//         "Nnewi South",
//         "Ogbaru",
//         "Onitsha North",
//         "Onitsha South",
//         "Orumba North",
//         "Orumba South",
//         "Oyi"
//     ],
//     "Bauchi": [
//         "Alkaleri",
//         "Bauchi",
//         "Bogoro",
//         "Dambam",
//         "Darazo",
//         "Dass",
//         "Gamawa",
//         "Ganjuwa",
//         "Giade",
//         "Itas/Gadau",
//         "Jama'are",
//         "Katagum",
//         "Kirfi",
//         "Misau",
//         "Ningi",
//         "Shira",
//         "Tafawa Balewa",
//         "Toro",
//         "Warji",
//         "Zaki"
//     ],
//     "Bayelsa": [
//         "Brass",
//         "Ekeremor",
//         "Kolokuma/Opokuma",
//         "Nembe",
//         "Ogbia",
//         "Sagbama",
//         "Southern Ijaw",
//         "Yenagoa"
//     ],
//     "Benue": [
//         "Agatu",
//         "Apa",
//         "Ado",
//         "Buruku",
//         "Gboko",
//         "Guma",
//         "Gwer East",
//         "Gwer West",
//         "Katsina-Ala",
//         "Konshisha",
//         "Kwande",
//         "Logo",
//         "Makurdi",
//         "Obi",
//         "Ogbadibo",
//         "Ohimini",
//         "Oju",
//         "Okpokwu",
//         "Oturkpo",
//         "Tarka",
//         "Ukum",
//         "Ushongo",
//         "Vandeikya"
//     ],
//     "Borno": [
//         "Abadam",
//         "Askira/Uba",
//         "Bama",
//         "Bayu",
//         "Biu",
//         "Chibok",
//         "Damboa",
//         "Dikwa",
//         "Gubio",
//         "Guzamala",
//         "Gwoza",
//         "Hawul",
//         "Jere",
//         "Kaga",
//         "Kala/Balge",
//         "Konduga",
//         "Kukawa",
//         "Kwaya Kusar",
//         "Mafa",
//         "Magumeri",
//         "Maiduguri",
//         "Marte",
//         "Mobbar",
//         "Monguno",
//         "Ngala",
//         "Nganzai",
//         "Shani"
//     ],
//     "CrossRiver": [
//         "Abi",
//         "Akamkpa",
//         "Akpabuyo",
//         "Bakassi",
//         "Bekwarra",
//         "Biase",
//         "Boki",
//         "Calabar Municipal",
//         "Calabar South",
//         "Etung",
//         "Ikom",
//         "Obanliku",
//         "Obubra",
//         "Obudu",
//         "Odukpani",
//         "Ogoja",
//         "Yakuur",
//         "Yala"
//     ],
//     "Delta": [
//         "Aniocha North",
//         "Aniocha South",
//         "Bomadi",
//         "Burutu",
//         "Ethiope East",
//         "Ethiope West",
//         "Ika North East",
//         "Ika South",
//         "Isoko North",
//         "Isoko South",
//         "Ndokwa East",
//         "Ndokwa West",
//         "Okpe",
//         "Oshimili North",
//         "Oshimili South",
//         "Patani",
//         "Sapele",
//         "Udu",
//         "Ughelli North",
//         "Ughelli South",
//         "Ukwuani",
//         "Uvwie",
//         "Bomadi",
//         "Warri North",
//         "Warri South",
//         "Warri South West"
//     ],
//     "Ebonyi": [
//         "Abakaliki",
//         "Afikpo North",
//         "Afikpo South",
//         "Ebonyi",
//         "Ezza North",
//         "Ezza South",
//         "Ikwo",
//         "Ishielu",
//         "Ivo",
//         "Izzi",
//         "Ohaozara",
//         "Ohaukwu",
//         "Onicha"
//     ],
//     "Edo": [
//         "Akoko-Edo",
//         "Egor",
//         "Esan Central",
//         "Esan North-East",
//         "Esan South-East",
//         "Esan West",
//         "Etsako Central",
//         "Etsako East",
//         "Etsako West",
//         "Igueben",
//         "Ikpoba-Okha",
//         "Oredo",
//         "Orhionmwon",
//         "Ovia North-East",
//         "Ovia South-West",
//         "Owan East",
//         "Owan West",
//         "Uhunmwonde"
//     ],
//     "Ekiti": [
//         "Ado-Ekiti",
//         "Efon",
//         "Ekiti East",
//         "Ekiti South-West",
//         "Ekiti West",
//         "Emure",
//         "Gbonyin",
//         "Ido-Osi",
//         "Ijero",
//         "Ikere",
//         "Ikole",
//         "Ilejemeje",
//         "Irepodun/Ifelodun",
//         "Ise/Orun",
//         "Moba",
//         "Oye"
//     ],
//     "Enugu": [
//         "Aninri",
//         "Awgu",
//         "Enugu East",
//         "Enugu North",
//         "Enugu South",
//         "Ezeagu",
//         "Igbo Etiti",
//         "Igbo Eze North",
//         "Igbo Eze South",
//         "Isi Uzo",
//         "Nkanu East",
//         "Nkanu West",
//         "Nsukka",
//         "Oji River",
//         "Udenu",
//         "Udi",
//         "Uzo-Uwani"
//     ],
//     "FCT": [
//         "Abaji",
//         "Bwari",
//         "Gwagwalada",
//         "Kuje",
//         "Kwali",
//         "Municipal Area Council"
//     ],
//     "Gombe": [
//         "Akko",
//         "Balanga",
//         "Billiri",
//         "Dukku",
//         "Funakaye",
//         "Gombe",
//         "Kaltungo",
//         "Kwami",
//         "Nafada",
//         "Shongom",
//         "Yamaltu/Deba"
//     ],
//     "Imo": [
//         "Aboh Mbaise",
//         "Ahiazu Mbaise",
//         "Ehime Mbano",
//         "Ezinihitte",
//         "Ideato North",
//         "Ideato South",
//         "Ihitte/Uboma",
//         "Ikeduru",
//         "Isiala Mbano",
//         "Isu",
//         "Mbaitoli",
//         "Ngor Okpala",
//         "Njaba",
//         "Nkwerre",
//         "Nwangele",
//         "Obowo",
//         "Oguta",
//         "Ohaji/Egbema",
//         "Okigwe",
//         "Orlu",
//         "Orsu",
//         "Oru East",
//         "Oru West",
//         "Owerri Municipal",
//         "Owerri North",
//         "Owerri West",
//         "Unuimo"
//     ],
//     "Jigawa": [
//         "Auyo",
//         "Babura",
//         "Biriniwa",
//         "Birnin Kudu",
//         "Buji",
//         "Dutse",
//         "Gagarawa",
//         "Garki",
//         "Gumel",
//         "Guri",
//         "Gwaram",
//         "Gwiwa",
//         "Hadejia",
//         "Jahun",
//         "Kafamin Hausa",
//         "Kaugama",
//         "Kazaure",
//         "Kiri Kasama",
//         "Kiyawa",
//         "Maigatari",
//         "Malam Madori",
//         "Miga",
//         "Ringim",
//         "Roni",
//         "Sule Tankarkar",
//         "Taura",
//         "Yankwashi"
//     ],
//     "Kaduna": [
//         "Birnin Gwari",
//         "Chikun",
//         "Giwa",
//         "Kajuru",
//         "Igabi",
//         "Ikara",
//         "Jaba",
//         "Jema'a",
//         "Kachia",
//         "Kaduna North",
//         "Kaduna South",
//         "Kagarko",
//         "Kauru",
//         "Kubau",
//         "Kudan",
//         "Lere",
//         "Makarfi",
//         "Sabon Gari",
//         "Sanga",
//         "Soba",
//         "Zangon Kataf",
//         "Zaria"
//     ],
//     "Kano": [
//         "Ajingi",
//         "Albasu",
//         "Bagwai",
//         "Bebeji",
//         "Bichi",
//         "Bunkure",
//         "Dala",
//         "Dambatta",
//         "Dawakin Kudu",
//         "Dawakin Tofa",
//         "Doguwa",
//         "Fagge",
//         "Gabasawa",
//         "Garko",
//         "Garun Mallam",
//         "Gaya",
//         "Gezawa",
//         "Gwale",
//         "Gwarzo",
//         "Kabo",
//         "Kano Municipal",
//         "Karaye",
//         "Kibiya",
//         "Kiru",
//         "Kumbotso",
//         "Kunchi",
//         "Kura",
//         "Madobi",
//         "Makoda",
//         "Minjibir",
//         "Nasarawa",
//         "Rano",
//         "Rimin Gado",
//         "Rogo",
//         "Shanono",
//         "Sumaila",
//         "Takai",
//         "Tarauni",
//         "Tofa",
//         "Tsanyawa",
//         "Tudun Wada",
//         "Ungogo",
//         "Warawa",
//         "Wudil"
//     ],
//     "Katsina": [
//         "Bakori",
//         "Batagarawa",
//         "Batsari",
//         "Baure",
//         "Bindawa",
//         "Charanchi",
//         "Dandume",
//         "Danja",
//         "Dan Musa",
//         "Daura",
//         "Dutsin Ma",
//         "Faskari",
//         "Funtua",
//         "Ingawa",
//         "Jibia",
//         "Kafur",
//         "Kaita",
//         "Kankara",
//         "Kankia",
//         "Katsina",
//         "Kurfi",
//         "Kusada",
//         "Mai'Adua",
//         "Malumfashi",
//         "Mani",
//         "Mashi",
//         "Matazu",
//         "Musawa",
//         "Rimi",
//         "Sabuwa",
//         "Safana",
//         "Sandamu",
//         "Zango"
//     ],
//     "Kebbi": [
//         "Aleiro",
//         "Arewa Dandi",
//         "Argungu",
//         "Augie",
//         "Bagudo",
//         "Birnin Kebbi",
//         "Bunza",
//         "Dandi",
//         "Fakai",
//         "Gwandu",
//         "Jega",
//         "Kalgo",
//         "Koko/Besse",
//         "Maiyama",
//         "Ngaski",
//         "Sakaba",
//         "Shanga",
//         "Suru",
//         "Wasagu/Danko",
//         "Yauri",
//         "Zuru"
//     ],
//     "Kogi": [
//         "Adavi",
//         "Ajaokuta",
//         "Ankpa",
//         "Bassa",
//         "Dekina",
//         "Ibaji",
//         "Idah",
//         "Igalamela-Odolu",
//         "Ijumu",
//         "Kabba/Bunu",
//         "Kogi",
//         "Lokoja",
//         "Mopa-Muro",
//         "Ofu",
//         "Ogori/Magongo",
//         "Okehi",
//         "Okene",
//         "Olamaboro",
//         "Omala",
//         "Yagba East",
//         "Yagba West"
//     ],
//     "Kwara": [
//         "Asa",
//         "Baruten",
//         "Edu",
//         "Ekiti",
//         "Ifelodun",
//         "Ilorin East",
//         "Ilorin South",
//         "Ilorin West",
//         "Irepodun",
//         "Isin",
//         "Kaiama",
//         "Moro",
//         "Offa",
//         "Oke Ero",
//         "Oyun",
//         "Pategi"
//     ],
//     "Lagos": [
//         "Agege",
//         "Ajeromi-Ifelodun",
//         "Alimosho",
//         "Amuwo-Odofin",
//         "Apapa",
//         "Badagry",
//         "Epe",
//         "Eti-Osa",
//         "Ibeju-Lekki",
//         "Ifako-Ijaiye",
//         "Ikeja",
//         "Ikorodu",
//         "Kosofe",
//         "Lagos Island",
//         "Lagos Mainland",
//         "Mushin",
//         "Ojo",
//         "Oshodi-Isolo",
//         "Shomolu",
//         "Surulere"
//     ],
//     "Nasarawa": [
//         "Akwanga",
//         "Awe",
//         "Doma",
//         "Karu",
//         "Keana",
//         "Keffi",
//         "Kokona",
//         "Lafia",
//         "Nasarawa",
//         "Nasarawa Egon",
//         "Obi",
//         "Toto",
//         "Wamba"
//     ],
//     "Niger": [
//         "Agaie",
//         "Agwara",
//         "Bida",
//         "Borgu",
//         "Bosso",
//         "Chanchaga",
//         "Edati",
//         "Gbako",
//         "Gurara",
//         "Katcha",
//         "Kontagora",
//         "Lapai",
//         "Lavun",
//         "Magama",
//         "Mariga",
//         "Mashegu",
//         "Minna",
//         "Mokwa",
//         "Moya",
//         "Paikoro",
//         "Rafi",
//         "Rijau",
//         "Shiroro",
//         "Suleja",
//         "Tafa",
//         "Wushishi"
//     ],
//     "Ogun": [
//         "Abeokuta North",
//         "Abeokuta South",
//         "Ado-Odo/Ota",
//         "Ewekoro",
//         "Ifo",
//         "Ijebu East",
//         "Ijebu North",
//         "Ijebu North East",
//         "Ijebu Ode",
//         "Ikenne",
//         "Imeko Afon",
//         "Ipokia",
//         "Obafemi Owode",
//         "Odeda",
//         "Odogbolu",
//         "Ogun Waterside",
//         "Remo North",
//         "Shagamu",
//         "Yewa North",
//         "Yewa South"
//     ],
//     "Ondo": [
//         "Akoko North-East",
//         "Akoko North-West",
//         "Akoko South-West",
//         "Akoko South-East",
//         "Akure North",
//         "Akure South",
//         "Ese Odo",
//         "Idanre",
//         "Ifedore",
//         "Ilaje",
//         "Ile Oluji/Okeigbo",
//         "Irele",
//         "Odigbo",
//         "Okitipupa",
//         "Ondo West",
//         "Ondo East",
//         "Owo",
//         "Ose"
//     ],
//     "Osun": [
//         "Atakunmosa East",
//         "Atakunmosa West",
//         "Aiyedaade",
//         "Aiyedire",
//         "Boluwaduro",
//         "Boripe",
//         "Ede North",
//         "Ede South",
//         "Ife Central",
//         "Ife East",
//         "Ife North",
//         "Ife South",
//         "Egbedore",
//         "Ejigbo",
//         "Ifedayo",
//         "Ifelodun",
//         "Ila",
//         "Ilesa East",
//         "Ilesa West",
//         "Irepodun",
//         "Irewole",
//         "Isokan",
//         "Iwo",
//         "Obokun",
//         "Odo Otin",
//         "Ola Oluwa",
//         "Olorunda",
//         "Oriade",
//         "Orolu",
//         "Osogbo"
//     ],
//     "Oyo": [
//         "Afijio",
//         "Akinyele",
//         "Atiba",
//         "Atisbo",
//         "Egbeda",
//         "Ibadan North",
//         "Ibadan North-East",
//         "Ibadan North-West",
//         "Ibadan South-East",
//         "Ibadan South-West",
//         "Ibarapa Central",
//         "Ibarapa East",
//         "Ibarapa North",
//         "Ido",
//         "Irepo",
//         "Iseyin",
//         "Itesiwaju",
//         "Iwajowa",
//         "Kajola",
//         "Lagelu",
//         "Ogbomosho North",
//         "Ogbomosho South",
//         "Ogo Oluwa",
//         "Olorunsogo",
//         "Oluyole",
//         "Ona Ara",
//         "Orelope",
//         "Ori Ire",
//         "Oyo East",
//         "Oyo West",
//         "Saki East",
//         "Saki West",
//         "Surulere"
//     ],
//     "Plateau": [
//         "Barkin Ladi",
//         "Bassa",
//         "Bokkos",
//         "Jos East",
//         "Jos North",
//         "Jos South",
//         "Kanam",
//         "Kanke",
//         "Langtang North",
//         "Langtang South",
//         "Mangu",
//         "Mikang",
//         "Pankshin",
//         "Qua'an Pan",
//         "Riyom",
//         "Shendam",
//         "Wase"
//     ],
//     "Rivers": [
//         "Abua/Odual",
//         "Ahoada East",
//         "Ahoada West",
//         "Akuku-Toru",
//         "Andoni",
//         "Asari-Toru",
//         "Bonny",
//         "Degema",
//         "Eleme",
//         "Emuoha",
//         "Etche",
//         "Gokana",
//         "Ikwerre",
//         "Khana",
//         "Obio/Akpor",
//         "Ogba/Egbema/Ndoni",
//         "Ogu/Bolo",
//         "Okrika",
//         "Omuma",
//         "Opobo/Nkoro",
//         "Oyigbo",
//         "Port Harcourt",
//         "Tai"
//     ],
//     "Sokoto": [
//         "Binji",
//         "Bodinga",
//         "Dange Shuni",
//         "Gada",
//         "Goronyo",
//         "Gudu",
//         "Gwadabawa",
//         "Illela",
//         "Isa",
//         "Kebbe",
//         "Kware",
//         "Rabah",
//         "Sabon Birni",
//         "Shagari",
//         "Silame",
//         "Sokoto North",
//         "Sokoto South",
//         "Tambuwal",
//         "Tangaza",
//         "Tureta",
//         "Wamako",
//         "Wurno",
//         "Yabo"
//     ],
//     "Taraba": [
//         "Ardo Kola",
//         "Bali",
//         "Donga",
//         "Gashaka",
//         "Gassol",
//         "Ibi",
//         "Jalingo",
//         "Karim Lamido",
//         "Kumi",
//         "Lau",
//         "Sardauna",
//         "Takum",
//         "Ussa",
//         "Wukari",
//         "Yorro",
//         "Zing"
//     ],
//     "Yobe": [
//         "Bade",
//         "Bursari",
//         "Damaturu",
//         "Fika",
//         "Fune",
//         "Geidam",
//         "Gujba",
//         "Gulani",
//         "Jakusko",
//         "Karasuwa",
//         "Machina",
//         "Nangere",
//         "Nguru",
//         "Potiskum",
//         "Tarmuwa",
//         "Yunusari",
//         "Yusufari"
//     ],
//     "Zamfara": [
//         "Anka",
//         "Bakura",
//         "Birnin Magaji/Kiyaw",
//         "Bukkuyum",
//         "Bungudu",
//         "Gummi",
//         "Gusau",
//         "Kaura Namoda",
//         "Maradun",
//         "Maru",
//         "Shinkafi",
//         "Talata Mafara",
//         "Chafe",
//         "Zurmi"
//     ]
// },
//   // {
//   //   Abia: ["Aba", "Umuahia", "Arochukwu", "Ohafia"],
//   //   Adamawa: ["Yola", "Mubi", "Numan", "Jimeta"],
//   //   AkwaIbom: ["Uyo", "Eket", "Ikot Ekpene", "Oron"],
//   //   Anambra: ["Awka", "Onitsha", "Nnewi", "Ekwulobia"],
//   //   Bauchi: ["Bauchi", "Azare", "Misau", "Jama'are"],
//   //   Bayelsa: ["Yenagoa", "Ogbia", "Brass", "Amassoma"],
//   //   Benue: ["Makurdi", "Gboko", "Otukpo", "Katsina-Ala"],
//   //   Borno: ["Maiduguri", "Bama", "Biu", "Dikwa"],
//   //   CrossRiver: ["Calabar", "Ikom", "Ogoja", "Ugep"],
//   //   Delta: ["Asaba", "Warri", "Sapele", "Ughelli"],
//   //   Ebonyi: ["Abakaliki", "Afikpo", "Onueke"],
//   //   Edo: ["Benin City", "Auchi", "Uromi", "Ekpoma"],
//   //   Ekiti: ["Ado Ekiti", "Ikere", "Ijero", "Ikole"],
//   //   Enugu: ["Enugu", "Nsukka", "Awgu", "Udi"],
//   //   FCT: ["Abuja", "Gwagwalada", "Kuje", "Bwari"],
//   //   Gombe: ["Gombe", "Kaltungo", "Duku"],
//   //   Imo: ["Owerri", "Orlu", "Okigwe"],
//   //   Jigawa: ["Dutse", "Hadejia", "Kazaure", "Gumel"],
//   //   Kaduna: ["Kaduna", "Zaria", "Kafanchan", "Saminaka"],
//   //   Kano: ["Kano", "Wudil", "Gwarzo", "Dambatta"],
//   //   Katsina: ["Katsina", "Daura", "Funtua"],
//   //   Kebbi: ["Birnin Kebbi", "Argungu", "Yauri"],
//   //   Kogi: ["Lokoja", "Okene", "Idah", "Kabba"],
//   //   Kwara: ["Ilorin", "Offa", "Jebba", "Omu-Aran"],
//   //   Lagos: ["Ikeja", "Lagos Island", "Ikorodu", "Epe", "Badagry"],
//   //   Nasarawa: ["Lafia", "Keffi", "Akwanga", "Karu"],
//   //   Niger: ["Minna", "Bida", "Suleja", "Kontagora"],
//   //   Ogun: ["Abeokuta", "Ijebu-Ode", "Sagamu", "Sango Otta"],
//   //   Ondo: ["Akure", "Ondo City", "Owo", "Okitipupa"],
//   //   Osun: ["Osogbo", "Ile-Ife", "Ilesa", "Ede"],
//   //   Oyo: ["Ibadan", "Ogbomosho", "Oyo", "Iseyin"],
//   //   Plateau: ["Jos", "Pankshin", "Shendam", "Bukuru"],
//   //   Rivers: ["Port Harcourt", "Obio-Akpor", "Bonny", "Eleme"],
//   //   Sokoto: ["Sokoto", "Tambuwal", "Gwadabawa"],
//   //   Taraba: ["Jalingo", "Wukari", "Bali", "Gembu"],
//   //   Yobe: ["Damaturu", "Potiskum", "Gashua"],
//   //   Zamfara: ["Gusau", "Kaura Namoda", "Talata Mafara"]
//   // },

//   Ghana: {
//     Ashanti: ["Kumasi", "Obuasi", "Bekwai", "Mampong"],
//     GreaterAccra: ["Accra", "Tema", "Madina", "Teshie"],
//     Central: ["Cape Coast", "Winneba", "Kasoa", "Elmina"],
//     Eastern: ["Koforidua", "Nkawkaw", "Nsawam"],
//     Western: ["Sekondi-Takoradi", "Tarkwa", "Axim"],
//     Northern: ["Tamale", "Yendi", "Savelugu"],
//     Volta: ["Ho", "Keta", "Aflao", "Kpandu"],
//     Bono: ["Sunyani", "Berekum", "Dormaa Ahenkro"],
//     BonoEast: ["Techiman", "Kintampo", "Nkoranza"],
//     Ahafo: ["Goaso", "Hwidiem", "Bechem"],
//     Savannah: ["Damongo", "Bole", "Salaga"],
//     NorthEast: ["Nalerigu", "Walewale", "Gambaga"],
//     UpperEast: ["Bolgatanga", "Navrongo", "Bawku"],
//     UpperWest: ["Wa", "Lawra", "Tumu"],
//     WesternNorth: ["Sefwi Wiawso", "Bibiani", "Enchi"],
//     Oti: ["Dambai", "Nkwanta", "Kadjebi"]
//   },

//   Cameroon: {
//     Centre: ["Yaoundé", "Mbalmayo", "Bafia"],
//     Littoral: ["Douala", "Edéa", "Nkongsamba"],
//     West: ["Bafoussam", "Dschang", "Foumban", "Bangangté"],
//     Northwest: ["Bamenda", "Kumbo", "Wum"],
//     Southwest: ["Buea", "Limbe", "Kumba", "Tiko"],
//     North: ["Garoua", "Guider", "Figuil"],
//     FarNorth: ["Maroua", "Yagoua", "Mokolo"],
//     Adamawa: ["Ngaoundéré", "Banyo", "Meiganga"],
//     East: ["Bertoua", "Batouri", "Abong-Mbang"],
//     South: ["Ebolowa", "Kribi", "Sangmélima"]
//   },

//   Kenya: {
//     Nairobi: ["Nairobi City", "Westlands", "Kibera"],
//     Mombasa: ["Mombasa City", "Nyali", "Likoni"],
//     Kisumu: ["Kisumu City", "Maseno", "Ahero"],
//     Nakuru: ["Nakuru", "Naivasha", "Gilgil"],
//     UasinGishu: ["Eldoret", "Turbo", "Burnt Forest"],
//     Kiambu: ["Thika", "Ruiru", "Kikuyu", "Limuru"],
//     Machakos: ["Machakos", "Athi River", "Kangundo"],
//     Kakamega: ["Kakamega", "Mumias", "Lugari"],
//     Meru: ["Meru", "Maua", "Nkubu"],
//     Kilifi: ["Kilifi", "Malindi", "Mtwapa"]
//     // Note: Kept to top 10 counties for brevity, though Kenya has 47.
//   },

//   SouthAfrica: {
//     Gauteng: ["Johannesburg", "Pretoria", "Soweto", "Centurion"],
//     WesternCape: ["Cape Town", "Stellenbosch", "George", "Paarl"],
//     KwaZuluNatal: ["Durban", "Pietermaritzburg", "Richards Bay"],
//     EasternCape: ["Gqeberha (Port Elizabeth)", "East London", "Mthatha"],
//     FreeState: ["Bloemfontein", "Welkom", "Kroonstad"],
//     Mpumalanga: ["Mbombela (Nelspruit)", "Witbank", "Secunda"],
//     Limpopo: ["Polokwane", "Tzaneen", "Mokopane"],
//     NorthWest: ["Rustenburg", "Mahikeng", "Potchefstroom"],
//     NorthernCape: ["Kimberley", "Upington", "Springbok"]
//   },

//   Uganda: {
//     Central: ["Kampala", "Entebbe", "Masaka", "Mukono"],
//     Western: ["Mbarara", "Fort Portal", "Kasese", "Hoima"],
//     Eastern: ["Jinja", "Mbale", "Tororo", "Soroti"],
//     Northern: ["Gulu", "Lira", "Arua", "Kitgum"]
//   },

//   Tanzania: {
//     DarEsSalaam: ["Ilala", "Kinondoni", "Temeke"],
//     Dodoma: ["Dodoma", "Kondoa", "Mpwapwa"],
//     Arusha: ["Arusha City", "Karatu", "Meru"],
//     Mwanza: ["Mwanza City", "Ilemela", "Nyamagana"],
//     Kilimanjaro: ["Moshi", "Same", "Rombo"],
//     Zanzibar: ["Zanzibar City", "Mkokotoni", "Chake Chake"]
//   },

//   Rwanda: {
//     Kigali: ["Gasabo", "Kicukiro", "Nyarugenge"],
//     Northern: ["Musanze", "Gicumbi", "Rulindo"],
//     Southern: ["Huye", "Muhanga", "Nyanza"],
//     Eastern: ["Rwamagana", "Nyagatare", "Kayonza"],
//     Western: ["Rubavu", "Rusizi", "Karongi"]
//   },

//   Ethiopia: {
//     AddisAbaba: ["Bole", "Yeka", "Kirkos"],
//     Oromia: ["Adama", "Jimma", "Bishoftu"],
//     Amhara: ["Bahir Dar", "Gondar", "Dessie"],
//     Tigray: ["Mekelle", "Axum", "Adigrat"],
//     Somali: ["Jijiga", "Godé", "Kebridehar"],
//     DireDawa: ["Dire Dawa"]
//   },

//   Senegal: {
//     Dakar: ["Dakar", "Pikine", "Guédiawaye", "Rufisque"],
//     Thies: ["Thiès", "Mbour", "Tivaouane"],
//     SaintLouis: ["Saint-Louis", "Richard Toll", "Dagana"],
//     Diourbel: ["Touba", "Diourbel", "Mbacké"],
//     Ziguinchor: ["Ziguinchor", "Bignona", "Oussouye"]
//   },

//   "Côte d'Ivoire": {
//     Abidjan: ["Cocody", "Yopougon", "Abobo", "Marcory"],
//     Yamoussoukro: ["Yamoussoukro", "Attiégouakro"],
//     BasSassandra: ["San-Pédro", "Soubré", "Sassandra"],
//     ValleeDuBandama: ["Bouaké", "Katiola", "Dabakala"],
//     Savanes: ["Korhogo", "Boundiali", "Ferkessédougou"]
//   },

//   Egypt: {
//     Cairo: ["Nasr City", "Maadi", "Heliopolis", "New Cairo"],
//     Alexandria: ["Montaza", "Smouha", "Borg El Arab"],
//     Giza: ["Dokki", "Agouza", "6th of October City"],
//     Dakahlia: ["Mansoura", "Mit Ghamr", "Talkha"],
//     RedSea: ["Hurghada", "Safaga", "Marsa Alam"]
//   },

//   Morocco: {
//     CasablancaSettat: ["Casablanca", "Mohammedia", "El Jadida"],
//     RabatSaleKenitra: ["Rabat", "Salé", "Kénitra"],
//     MarrakechSafi: ["Marrakech", "Safi", "Essaouira"],
//     FesMeknes: ["Fès", "Meknès", "Taza"],
//     TangerTetouanAlHoceima: ["Tangier", "Tétouan", "Chefchaouen"]
//   },

//   UnitedStates: {
//     California: ["Los Angeles", "San Francisco", "San Diego", "Sacramento"],
//     Texas: ["Houston", "Austin", "Dallas", "San Antonio"],
//     NewYork: ["New York City", "Buffalo", "Rochester", "Albany"],
//     Florida: ["Miami", "Orlando", "Tampa", "Jacksonville"],
//     Illinois: ["Chicago", "Springfield", "Peoria"]
//     // Example subset.
//   },

//   UnitedKingdom: {
//     England: ["London", "Manchester", "Birmingham", "Bristol"],
//     Scotland: ["Edinburgh", "Glasgow", "Aberdeen", "Dundee"],
//     Wales: ["Cardiff", "Swansea", "Newport"],
//     NorthernIreland: ["Belfast", "Derry", "Lisburn"]
//   },

//   Canada: {
//     Ontario: ["Toronto", "Ottawa", "Mississauga", "Hamilton"],
//     Quebec: ["Montreal", "Quebec City", "Laval", "Gatineau"],
//     BritishColumbia: ["Vancouver", "Victoria", "Surrey", "Kelowna"],
//     Alberta: ["Calgary", "Edmonton", "Red Deer"],
//     NovaScotia: ["Halifax", "Sydney", "Truro"]
//   },

//   Australia: {
//     NewSouthWales: ["Sydney", "Newcastle", "Wollongong"],
//     Victoria: ["Melbourne", "Geelong", "Ballarat"],
//     Queensland: ["Brisbane", "Gold Coast", "Cairns"],
//     WesternAustralia: ["Perth", "Fremantle", "Mandurah"],
//     SouthAustralia: ["Adelaide", "Mount Gambier", "Gawler"]
//   },

//   India: {
//     "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Tirupati", "Kurnool", "Kakinada", "Rajahmundry", "Kadapa", "Anantapur", "Eluru", "Vizianagaram"],
//     "Arunachal Pradesh": ["Itanagar", "Tawang", "Naharlagun", "Pasighat", "Ziro", "Bomdila", "Tezu", "Khonsa"],
//     "Assam": ["Guwahati", "Dibrugarh", "Silchar", "Jorhat", "Nagaon", "Tinsukia", "Tezpur", "Bongaigaon", "Dhubri", "Karimganj"],
//     "Bihar": ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Purnia", "Darbhanga", "Bihar Sharif", "Arrah", "Begusarai", "Katihar", "Munger", "Chhapra"],
//     "Chhattisgarh": ["Raipur", "Bhilai", "Bilaspur", "Korba", "Rajnandgaon", "Raigarh", "Jagdalpur", "Ambikapur", "Dhamtari"],
//     "Goa": ["Panaji", "Margao", "Vasco da Gama", "Mapusa", "Ponda"],
//     "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Junagadh", "Gandhinagar", "Anand", "Morbi", "Nadiad", "Bharuch"],
//     "Haryana": ["Faridabad", "Gurugram", "Panipat", "Ambala", "Yamunanagar", "Rohtak", "Hisar", "Karnal", "Sonipat", "Panchkula", "Sirsa"],
//     "Himachal Pradesh": ["Shimla", "Dharamshala", "Solan", "Mandi", "Nahan", "Una", "Hamirpur", "Kullu", "Chamba"],
//     "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro Steel City", "Deoghar", "Phusro", "Hazaribagh", "Giridih", "Ramgarh"],
//     "Karnataka": ["Bengaluru", "Mysuru", "Mangaluru", "Hubli-Dharwad", "Belagavi", "Ballari", "Kalaburagi", "Davanagere", "Shivamogga", "Tumakuru", "Udupi"],
//     "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode", "Kollam", "Thrissur", "Alappuzha", "Palakkad", "Kannur", "Kottayam", "Malappuram"],
//     "Madhya Pradesh": ["Indore", "Bhopal", "Jabalpur", "Gwalior", "Ujjain", "Sagar", "Dewas", "Satna", "Ratlam", "Rewa", "Murwara (Katni)", "Singrauli"],
//     "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Thane", "Pimpri-Chinchwad", "Kalyan-Dombivli", "Vasai-Virar", "Aurangabad", "Navi Mumbai", "Solapur", "Mira-Bhayandar", "Bhiwandi", "Amravati", "Nanded", "Kolhapur"],
//     "Manipur": ["Imphal", "Churachandpur", "Thoubal", "Kakching", "Ukhrul"],
//     "Meghalaya": ["Shillong", "Tura", "Jowai", "Nongpoh", "Williamnagar"],
//     "Mizoram": ["Aizawl", "Lunglei", "Saiha", "Champhai", "Kolasib"],
//     "Nagaland": ["Dimapur", "Kohima", "Mokokchung", "Tuensang", "Wokha", "Zunheboto"],
//     "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur", "Puri", "Balasore", "Bhadrak", "Baripada", "Jharsuguda"],
//     "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Mohali", "Hoshiarpur", "Pathankot", "Moga", "Abohar"],
//     "Rajasthan": ["Jaipur", "Jodhpur", "Kota", "Bikaner", "Ajmer", "Udaipur", "Bhilwara", "Alwar", "Bharatpur", "Sikar", "Sri Ganganagar", "Pali"],
//     "Sikkim": ["Gangtok", "Namchi", "Geyzing", "Mangan"],
//     "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli", "Tiruppur", "Erode", "Vellore", "Thoothukudi", "Dindigul", "Thanjavur"],
//     "Telangana": ["Hyderabad", "Warangal", "Nizamabad", "Khammam", "Karimnagar", "Ramagundam", "Mahbubnagar", "Nalgonda", "Adilabad"],
//     "Tripura": ["Agartala", "Dharmanagar", "Udaipur", "Kailasahar", "Ambassa"],
//     "Uttar Pradesh": ["Lucknow", "Kanpur", "Varanasi", "Agra", "Meerut", "Ghaziabad", "Prayagraj", "Bareilly", "Aligarh", "Moradabad", "Saharanpur", "Gorakhpur", "Noida", "Firozabad", "Jhansi", "Muzaffarnagar"],
//     "Uttarakhand": ["Dehradun", "Haridwar", "Roorkee", "Haldwani", "Rudrapur", "Kashipur", "Rishikesh"],
//     "West Bengal": ["Kolkata", "Asansol", "Siliguri", "Durgapur", "Bardhaman", "Malda", "Baharampur", "Habra", "Kharagpur", "Shantipur", "Dankuni"],
//     "Andaman and Nicobar Islands": ["Port Blair"],
//     "Chandigarh": ["Chandigarh"],
//     "Dadra and Nagar Haveli and Daman and Diu": ["Daman", "Diu", "Silvassa"],
//     "Delhi": ["New Delhi", "North Delhi", "South Delhi", "East Delhi", "West Delhi", "Dwarka", "Rohini"],
//     "Jammu and Kashmir": ["Srinagar", "Jammu", "Anantnag", "Baramulla", "Kathua", "Samba"],
//     "Ladakh": ["Leh", "Kargil"],
//     "Lakshadweep": ["Kavaratti", "Agatti", "Amini"],
//     "Puducherry": ["Puducherry", "Karaikal", "Mahe", "Yanam"]
//   }
//   // India: {
//   //   Maharashtra: ["Mumbai", "Pune", "Nagpur", "Nashik"],
//   //   Delhi: ["New Delhi", "North Delhi", "South Delhi"],
//   //   Karnataka: ["Bengaluru", "Mysuru", "Mangaluru", "Hubli"],
//   //   TamilNadu: ["Chennai", "Coimbatore", "Madurai"],
//   //   Gujarat: ["Ahmedabad", "Surat", "Vadodara"],
//   //   UttarPradesh: ["Lucknow", "Kanpur", "Varanasi", "Agra"]
//   // }
// };



















// // const countries = [
// //   { name: "Nigeria", code: "NG", flag: "🇳🇬" },
// //   { name: "Ghana", code: "GH", flag: "🇬🇭" },
// //   { name: "Cameroon", code: "CM", flag: "🇨🇲" },
// //   { name: "Kenya", code: "KE", flag: "🇰🇪" },
// //   { name: "South Africa", code: "ZA", flag: "🇿🇦" },
// //   { name: "Uganda", code: "UG", flag: "🇺🇬" },
// //   { name: "Tanzania", code: "TZ", flag: "🇹🇿" },
// //   { name: "Rwanda", code: "RW", flag: "🇷🇼" },
// //   { name: "Ethiopia", code: "ET", flag: "🇪🇹" },
// //   { name: "Senegal", code: "SN", flag: "🇸🇳" },
// //   { name: "Côte d'Ivoire", code: "CI", flag: "🇨🇮" },
// //   { name: "Egypt", code: "EG", flag: "🇪🇬" },
// //   { name: "Morocco", code: "MA", flag: "🇲🇦" },
// //   { name: "United States", code: "US", flag: "🇺🇸" },
// //   { name: "United Kingdom", code: "GB", flag: "🇬🇧" },
// //   { name: "Canada", code: "CA", flag: "🇨🇦" },
// //   { name: "Australia", code: "AU", flag: "🇦🇺" },
// //   { name: "India", code: "IN", flag: "🇮🇳" },
// // ];

// // // Mock Location Data Dictionary (Expand as needed or replace with an API call)
// // const locationData: Record<string, Record<string, string[]>> = {
// //   Nigeria: {
// //     Lagos: ["Ikeja", "Eti-Osa", "Ibeju-Lekki", "Kosofe", "Alimosho", "Oshodi-Isolo"],
// //     Abuja: ["Abaji", "Bwari", "Municipal", "Gwagwalada", "Kuje", "Kwali"],
// //     Rivers: ["Port Harcourt", "Obio-Akpor", "Eleme", "Ikwerre", "Bonny"],
// //     Kano: ["Kano Municipal", "Dala", "Gwale", "Tarauni"],
// //     Abia: ["Aba North", "Aba South", "Arochukwu", "Bende"],
// //     Delta: ["Oshimili South", "Oshimili North", "Aniocha North", "Aniocha South"],
// //   },
// //   Ghana: {
// //     "Greater Accra": ["Accra Metropolis", "Tema Metropolis", "La Dade Kotopon"],
// //     Ashanti: ["Kumasi Metropolis", "Obuasi", "Bekwai"],
// //   },
// //   India: {
// //     Maharashtra: ["Mumbai", "Pune", "Nagpur", "Thane"],
// //     Delhi: ["New Delhi", "North Delhi", "South Delhi"],
// //   },
// // };

// const PatientRegistration: React.FC = () => {
//   const navigate = useNavigate();
//   const [searchParams] = useSearchParams();
//   const mrnFromUrl = searchParams.get("mrn");

//   const { notify } = useNotification();
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [isRegistered, setIsRegistered] = useState(false);
//   const [isLoadingPatient, setIsLoadingPatient] = useState(false);
//   const [isEditMode, setIsEditMode] = useState(!mrnFromUrl);
//   const [generatedMRN, setGeneratedMRN] = useState<string>("");

//   // Search input state
//   const [searchInput, setSearchInput] = useState("");

//   // Tab State for Row 2
//   const [activeBottomTab, setActiveBottomTab] = useState<"clinical" | "consent">("clinical");

//   // Payer & Referral specific state
//   const [payerTypes, setPayerTypes] = useState<any[]>([]);
//   const [availablePayers, setAvailablePayers] = useState<any[]>([]);
//   const [referralSources, setReferralSources] = useState<any[]>([]);
//   const [loadingPayers, setLoadingPayers] = useState(false);
//   const [selectedPayerTypeId, setSelectedPayerTypeId] = useState<number | null>(null);

//   const [formData, setFormData] = useState({
//     pt_info: {
//       first_name: "",
//       middle_name: "",
//       last_name: "",
//       gender: "",
//       date_of_birth: "",
//       phone: "",
//       email: "",
//       address: "",
//       marital_status: "",
//       nationality: "Nigeria", // Set default to Nigeria
//       state_of_origin: "",
//       lga: "",
//       photo_url: "",
//       is_emergency: false,
//       nok_full_name: "",
//       nok_relationship: "",
//       nok_phone: "",
//       nok_alternate_phone: "",
//       nok_address: "",
//     },
//     medical_profile: {
//       blood_group: "",
//       genotype: "",
//       known_allergies: "",
//       chronic_conditions: "",
//       disability_notes: "",
//       special_alerts: "",
//     },
//     emergency_contacts: [
//       {
//         full_name: "",
//         relationship: "",
//         phone: "",
//         alternate_phone: "",
//         address: "",
//         is_primary: true,
//       },
//     ],
//     payer: {
//       payer_type: "",
//       payer_id: 0,
//       policy_number: "",
//     },
//     referral: {
//       referral_source_id: 1,
//       referring_doctor_name: "",
//       referring_facility_name: "",
//       referred_by_name: "",
//       referral_channel_detail: "",
//       campaign_code: "",
//       notes: "",
//     },
//     disclosure_consent: {
//       pref_do_not_share: false,
//       pref_share_listed: true,
//       pref_share_family: false,
//       pref_share_caregiver: false,
//       pref_discuss_present: false,
//       pref_emergency_listed: true,
//       info_diagnosis: true,
//       info_test_results: true,
//       info_treatment_plan: true,
//       info_medication: true,
//       info_surgical_procedures: true,
//       info_progress_updates: true,
//       info_discharge_plans: true,
//       info_billing: true,
//       info_all: true,
//       patient_signed: false,
//       patient_signature_data: "",
//       witness_name: "",
//       witness_signed: false,
//       witness_signature_data: "",
//     },
//     authorized_persons: [
//       { full_name: "", relationship: "", phone: "" },
//       { full_name: "", relationship: "", phone: "" },
//       { full_name: "", relationship: "", phone: "" },
//     ],
//   });

//   const [errors, setErrors] = useState<Record<string, string>>({});
//   const [dragActive, setDragActive] = useState(false);
//   const [isCameraOpen, setIsCameraOpen] = useState(false);
//   const videoRef = useRef<HTMLVideoElement>(null);
//   const canvasRef = useRef<HTMLCanvasElement>(null);

//   const activeReferralCode =
//     referralSources.find((s) => s.id === formData.referral.referral_source_id)?.code || "";

//   // Initial Data Load
//   useEffect(() => {
//     const init = async () => {
//       try {
//         const [pTypes, rSources] = await Promise.all([
//           patientService.getPayerTypes(),
//           patientService.getReferralSources(),
//         ]);
//         setPayerTypes(pTypes);
//         setReferralSources(rSources);

//         if (mrnFromUrl) {
//           setIsLoadingPatient(true);
//           const data = await patientService.getPatientByMrn(mrnFromUrl);
//           if (data) {
//             const nok = data.next_of_kin || {};
//             setFormData({
//               ...formData,
//               pt_info: {
//                 ...formData.pt_info,
//                 ...data.demographics,
//                 marital_status: data.demographics?.marital_status || "",
//                 nationality: data.demographics?.nationality || "Nigeria",
//                 state_of_origin: data.demographics?.state_of_origin || "",
//                 lga: data.demographics?.lga || "",
//                 photo_url: data.demographics?.photo_url || "",
//                 nok_full_name: nok.full_name || data.demographics?.nok_full_name || "",
//                 nok_relationship: nok.relationship || data.demographics?.nok_relationship || "",
//                 nok_phone: nok.phone || data.demographics?.nok_phone || "",
//                 nok_alternate_phone: nok.alternate_phone || data.demographics?.nok_alternate_phone || "",
//                 nok_address: nok.address || data.demographics?.nok_address || "",
//               },
//               medical_profile: {
//                 ...formData.medical_profile,
//                 ...data.medical_profile,
//                 disability_notes: data.medical_profile?.disability_notes || "",
//               },
//               emergency_contacts:
//                 data.emergency_contacts?.length > 0
//                   ? [
//                       {
//                         ...data.emergency_contacts[0],
//                         is_primary:
//                           data.emergency_contacts[0].is_primary === 1 ||
//                           data.emergency_contacts[0].is_primary === true,
//                       },
//                     ]
//                   : formData.emergency_contacts,
//               payer: {
//                 payer_type: data.payer?.payer_type || "",
//                 payer_id: data.payer?.payer_id || data.payer?.id || 0,
//                 policy_number: data.payer?.policy_number || "",
//               },
//               referral: data.referral || formData.referral,
//               disclosure_consent: data.disclosure_consent || formData.disclosure_consent,
//               authorized_persons:
//                 data.authorized_persons?.length > 0
//                   ? [
//                       data.authorized_persons[0] || { full_name: "", relationship: "", phone: "" },
//                       data.authorized_persons[1] || { full_name: "", relationship: "", phone: "" },
//                       data.authorized_persons[2] || { full_name: "", relationship: "", phone: "" },
//                     ]
//                   : formData.authorized_persons,
//             });

//             if (data.payer?.payer_type) {
//               const matchedType = pTypes.find((t: any) => t.code === data.payer.payer_type);
//               if (matchedType) {
//                 setSelectedPayerTypeId(matchedType.id);
//                 const payers = await patientService.getPayers(matchedType.id);
//                 setAvailablePayers(payers);

//                 if (data.payer.payer_name && (!data.payer.payer_id && !data.payer.id)) {
//                   const matchedPayer = payers.find(
//                     (p: any) => p.name.toLowerCase() === data.payer.payer_name.toLowerCase()
//                   );
//                   if (matchedPayer) {
//                     setFormData((prev) => ({
//                       ...prev,
//                       payer: { ...prev.payer, payer_id: matchedPayer.id },
//                     }));
//                   }
//                 }
//               }
//             }
//             setIsEditMode(false);
//           }
//           setIsLoadingPatient(false);
//         }
//       } catch (err) {
//         notify("System load error", "error");
//         setIsLoadingPatient(false);
//       }
//     };
//     init();
//   }, [mrnFromUrl]);

//   const fetchPayersList = async (typeId: number) => {
//     setLoadingPayers(true);
//     try {
//       const data = await patientService.getPayers(typeId);
//       setAvailablePayers(data);
//     } catch (err) {
//       notify("Failed to load specific providers", "error");
//     } finally {
//       setLoadingPayers(false);
//     }
//   };

//   const calculateAge = (dob: string) => {
//     if (!dob) return "";
//     const birthDate = new Date(dob);
//     const today = new Date();

//     let years = today.getFullYear() - birthDate.getFullYear();
//     let months = today.getMonth() - birthDate.getMonth();
//     let days = today.getDate() - birthDate.getDate();

//     if (days < 0) {
//       months--;
//       const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
//       days += prevMonth.getDate();
//     }
//     if (months < 0) {
//       years--;
//       months += 12;
//     }

//     const parts = [];
//     if (years > 0) parts.push(`${years} yr${years > 1 ? "s" : ""}`);
//     if (months > 0) parts.push(`${months} mth${months > 1 ? "s" : ""}`);
//     if (days > 0 || (years === 0 && months === 0)) parts.push(`${days} d`);

//     return parts.join(" ");
//   };

//   const validateForm = () => {
//     const newErrors: Record<string, string> = {};
//     const isEmergency = formData.pt_info.is_emergency;

//     if (!formData.pt_info.first_name) newErrors.first_name = "Required";
//     if (!formData.pt_info.last_name) newErrors.last_name = "Required";
    
//     // Make these optional if it is an emergency
//     if (!isEmergency) {
//       if (!formData.pt_info.phone) newErrors.phone = "Required";
//       if (!formData.pt_info.date_of_birth) newErrors.dob = "Required";
//       if (!formData.pt_info.gender) newErrors.gender = "Required";
//       if (!formData.pt_info.address) newErrors.address = "Required";
//       if (!formData.emergency_contacts[0].full_name) newErrors.emergency_contact_name = "Required";
//       if (!formData.emergency_contacts[0].phone) newErrors.emergency_contact_phone = "Required";
//       if (!formData.pt_info.nok_full_name) newErrors.next_of_kin_name = "Required";
//       if (!formData.pt_info.nok_phone) newErrors.next_of_kin_phone = "Required";
//       if (!formData.payer.payer_type) newErrors.payer_type = "Required";
//       if (!formData.payer.payer_id) newErrors.payer_id = "Required";
//     }

//     setErrors(newErrors);
//     if (Object.keys(newErrors).length > 0) {
//       notify("Please fill in mandatory fields", "warning");
//       if (newErrors.emergency_contact_name || newErrors.payer_type || newErrors.payer_id) {
//         setActiveBottomTab("clinical");
//       }
//     }
//     return Object.keys(newErrors).length === 0;
//   };

//   // Helper to ensure only numbers are entered
//   const handlePhoneInput = (value: string, updateFn: (val: string) => void) => {
//     const numericValue = value.replace(/[^0-9]/g, "");
//     updateFn(numericValue);
//   };

//   const handleSearchSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (searchInput.trim().length > 0) {
//       navigate(`?mrn=${searchInput.trim()}`);
//       setSearchInput("");
//     }
//   };

//   // Cascading Handlers
//   const handleCountryChange = (countryName: string) => {
//     setFormData((prev) => ({
//       ...prev,
//       pt_info: {
//         ...prev.pt_info,
//         nationality: countryName,
//         state_of_origin: "", // Reset state
//         lga: "", // Reset LGA
//       },
//     }));
//   };

//   const handleStateChange = (stateName: string) => {
//     setFormData((prev) => ({
//       ...prev,
//       pt_info: {
//         ...prev.pt_info,
//         state_of_origin: stateName,
//         lga: "", // Reset LGA
//       },
//     }));
//   };

//   const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (file) {
//       processFile(file);
//     }
//   };

//   const processFile = (file: File) => {
//     if (!file.type.startsWith("image/")) {
//       notify("Please upload an image file", "warning");
//       return;
//     }
//     const reader = new FileReader();
//     reader.onloadend = () => {
//       updatePTInfo("photo_url", reader.result as string);
//     };
//     reader.readAsDataURL(file);
//   };

//   const handleDrag = (e: React.DragEvent) => {
//     e.preventDefault();
//     e.stopPropagation();
//     if (e.type === "dragenter" || e.type === "dragover") {
//       setDragActive(true);
//     } else if (e.type === "dragleave") {
//       setDragActive(false);
//     }
//   };

//   const handleDrop = (e: React.DragEvent) => {
//     e.preventDefault();
//     e.stopPropagation();
//     setDragActive(false);
//     if (e.dataTransfer.files && e.dataTransfer.files[0]) {
//       processFile(e.dataTransfer.files[0]);
//     }
//   };

//   const startCamera = async () => {
//     setIsCameraOpen(true);
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({
//         video: { facingMode: "user" },
//       });
//       if (videoRef.current) {
//         videoRef.current.srcObject = stream;
//       }
//     } catch (err) {
//       notify("Could not access camera", "error");
//       setIsCameraOpen(false);
//     }
//   };

//   const stopCamera = () => {
//     const stream = videoRef.current?.srcObject as MediaStream;
//     stream?.getTracks().forEach((track) => track.stop());
//     setIsCameraOpen(false);
//   };

//   const capturePhoto = () => {
//     if (videoRef.current && canvasRef.current) {
//       const video = videoRef.current;
//       const canvas = canvasRef.current;
//       canvas.width = video.videoWidth;
//       canvas.height = video.videoHeight;
//       const ctx = canvas.getContext("2d");
//       ctx?.drawImage(video, 0, 0);
//       const dataUrl = canvas.toDataURL("image/jpeg");
//       updatePTInfo("photo_url", dataUrl);
//       stopCamera();
//     }
//   };

//   const handleSubmit = async () => {
//     if (!validateForm()) return;
//     setIsSubmitting(true);
//     try {
//       const payloadData = {
//         pt_info: {
//           first_name: formData.pt_info.first_name,
//           middle_name: formData.pt_info.middle_name,
//           last_name: formData.pt_info.last_name,
//           gender: formData.pt_info.gender,
//           date_of_birth: formData.pt_info.date_of_birth,
//           phone: formData.pt_info.phone,
//           email: formData.pt_info.email,
//           address: formData.pt_info.address,
//           marital_status: formData.pt_info.marital_status,
//           nationality: formData.pt_info.nationality,
//           state_of_origin: formData.pt_info.state_of_origin,
//           lga: formData.pt_info.lga,
//           photo_url: formData.pt_info.photo_url || "",
//           is_emergency: formData.pt_info.is_emergency,
//         },
//         next_of_kin: {
//           full_name: formData.pt_info.nok_full_name,
//           relationship: formData.pt_info.nok_relationship,
//           phone: formData.pt_info.nok_phone,
//           alternate_phone: formData.pt_info.nok_alternate_phone,
//           address: formData.pt_info.nok_address,
//         },
//         medical_profile: {
//           blood_group: formData.medical_profile.blood_group,
//           genotype: formData.medical_profile.genotype,
//           known_allergies: formData.medical_profile.known_allergies,
//           chronic_conditions: formData.medical_profile.chronic_conditions,
//           disability_notes: formData.medical_profile.disability_notes || null,
//           special_alerts: formData.medical_profile.special_alerts,
//         },
//         emergency_contacts: formData.emergency_contacts.map((ec) => ({
//           full_name: ec.full_name,
//           relationship: ec.relationship,
//           phone: ec.phone,
//           alternate_phone: ec.alternate_phone,
//           address: ec.address,
//           is_primary: ec.is_primary ? 1 : 0,
//         })),
//         payer: {
//           payer_type: formData.payer.payer_type,
//           payer_id: formData.payer.payer_id,
//         },
//         referral: formData.referral,
//         disclosure_consent: formData.disclosure_consent,
//         authorized_persons: formData.authorized_persons.filter((p) => p.full_name.trim() !== ""),
//       };

//       if (mrnFromUrl) {
//         await patientService.updatePatient(mrnFromUrl, payloadData);
//         notify("Patient profile successfully updated", "success");
//         setIsEditMode(false);
//       } else {
//         const response = await patientService.registerPatient(payloadData);
//         if (response && response.data && response.data.mrn) {
//           setGeneratedMRN(response.data.mrn);
//         } else {
//           setGeneratedMRN("Generated");
//         }
//         setIsRegistered(true);
//         notify("Registration committed to Master Index", "success");
//       }
//     } catch (err: any) {
//       notify(err.response?.data?.message || "Submission failed", "error");
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   const updatePTInfo = (field: string, value: any) => {
//     setFormData((prev) => ({
//       ...prev,
//       pt_info: {
//         ...prev.pt_info,
//         [field]: field === "is_emergency" ? value === "true" || value === true : value,
//       },
//     }));
//   };

//   const updateMedical = (field: string, value: string) => {
//     setFormData((prev) => ({
//       ...prev,
//       medical_profile: { ...prev.medical_profile, [field]: value },
//     }));
//   };

//   const updateEmergency = (field: string, value: string) => {
//     const contacts = [...formData.emergency_contacts];
//     contacts[0] = { ...contacts[0], [field]: value };
//     setFormData((prev) => ({ ...prev, emergency_contacts: contacts }));
//   };

//   const updateNextOfKin = (field: string, value: string) => {
//     setFormData((prev) => ({
//       ...prev,
//       pt_info: { ...prev.pt_info, [field]: value },
//     }));
//   };

//   const handlePayerTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
//     const code = e.target.value;
//     const matched = payerTypes.find((t: any) => t.code === code);

//     setFormData((prev) => ({
//       ...prev,
//       payer: { ...prev.payer, payer_type: code, payer_id: 0 },
//     }));

//     if (matched) {
//       setSelectedPayerTypeId(matched.id);
//       fetchPayersList(matched.id);
//     } else {
//       setSelectedPayerTypeId(null);
//       setAvailablePayers([]);
//     }
//   };

//   const updateReferral = (field: string, value: any) => {
//     setFormData((prev) => ({ ...prev, referral: { ...prev.referral, [field]: value } }));
//   };

//   const toggleConsentPref = (field: string) => {
//     setFormData((prev) => {
//       let consent = { ...prev.disclosure_consent, [field]: !(prev.disclosure_consent as any)[field] };
//       if (field === "pref_do_not_share" && consent.pref_do_not_share) {
//         consent = {
//           ...consent,
//           pref_share_listed: false,
//           pref_share_family: false,
//           pref_share_caregiver: false,
//           pref_discuss_present: false,
//           pref_emergency_listed: false,
//         };
//       } else if (field !== "pref_do_not_share" && consent[field as keyof typeof consent]) {
//         consent.pref_do_not_share = false;
//       }
//       return { ...prev, disclosure_consent: consent };
//     });
//   };

//   const toggleConsentInfo = (field: string) => {
//     setFormData((prev) => {
//       let consent = { ...prev.disclosure_consent, [field]: !(prev.disclosure_consent as any)[field] };
//       if (field === "info_all" && consent.info_all) {
//         consent = {
//           ...consent,
//           info_diagnosis: true,
//           info_test_results: true,
//           info_treatment_plan: true,
//           info_medication: true,
//           info_surgical_procedures: true,
//           info_progress_updates: true,
//           info_discharge_plans: true,
//           info_billing: true,
//         };
//       } else if (field !== "info_all" && !consent[field as keyof typeof consent]) {
//         consent.info_all = false;
//       }
//       return { ...prev, disclosure_consent: consent };
//     });
//   };

//   const updateAuthPerson = (index: number, field: string, value: string) => {
//     const list = [...formData.authorized_persons];
//     list[index] = { ...list[index], [field]: value };
//     setFormData((prev) => ({ ...prev, authorized_persons: list }));
//   };

//   if (isLoadingPatient) {
//     return (
//       <div className="flex items-center justify-center h-[60vh]">
//         <div className="text-center space-y-4">
//           <Loader2 size={48} className="animate-spin text-brand-primary mx-auto" />
//           <p className="text-sm font-black text-slate-400 uppercase tracking-widest">
//             Retrieving Secure Index...
//           </p>
//         </div>
//       </div>
//     );
//   }

//   if (isRegistered) {
//     return (
//       <div className="max-w-2xl mx-auto py-10 animate-in zoom-in-95 duration-500">
//         <div className="bg-white rounded-[48px] border border-slate-200 shadow-2xl p-12 text-center">
//           <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-[32px] flex items-center justify-center mx-auto mb-8 border border-emerald-100 shadow-inner">
//             <CheckCircle2 size={48} />
//           </div>
//           <h2 className="text-4xl font-black text-slate-800 tracking-tight leading-none">
//             Enrollment Successful
//           </h2>

//           <div className="my-8 p-6 bg-slate-50 border border-slate-200 rounded-3xl">
//             <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-2">
//               Patient Registration Number (MRN)
//             </p>
//             <p className="text-5xl font-black text-brand-primary font-mono tracking-tight">
//               {generatedMRN}
//             </p>
//             <p className="text-slate-400 font-medium text-sm mt-3">
//               Please provide this number to the patient for all future hospital visits.
//             </p>
//           </div>

//           <p className="text-slate-500 font-medium text-lg leading-relaxed">
//             Patient{" "}
//             <span className="text-slate-900 font-black italic">
//               {formData.pt_info.first_name} {formData.pt_info.last_name}
//             </span>{" "}
//             has been successfully provisioned in the system.
//           </p>

//           <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4">
//             <button
//               onClick={() => window.open(`/print/patient-card/${generatedMRN}`, "_blank")}
//               className="flex items-center justify-center gap-3 px-8 py-5 bg-teal-600 text-white rounded-[24px] font-black uppercase text-xs tracking-widest hover:bg-teal-700 transition-all shadow-xl shadow-teal-100"
//             >
//               <Printer size={20} /> Print Patient ID
//             </button>
//             <button
//               onClick={() => navigate("/patients/search")}
//               className="flex items-center justify-center gap-3 px-8 py-5 bg-slate-900 text-white rounded-[24px] font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all shadow-xl active:scale-95"
//             >
//               Return to Search <ChevronRight size={20} />
//             </button>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   // Derive if we are in an emergency state for UI feedback
//   const isEmergency = formData.pt_info.is_emergency;

//   return (
//     <div className="w-full min-h-screen bg-slate-50/50 animate-in slide-in-from-bottom-4 duration-500">
//       <div className="bg-white border border-slate-200 overflow-hidden flex flex-col pt-6 min-h-full">
//         {/* Header Block */}
//         <div className="px-10 flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
//           <div className="flex items-center gap-4">
//             <div className="relative group">
//               <div
//                 className={`w-16 h-16 rounded-full overflow-hidden border-2 ${
//                   dragActive ? "border-brand-primary bg-brand-active" : "border-slate-200"
//                 } flex items-center justify-center bg-slate-50 transition-all shadow-sm`}
//                 onDragEnter={handleDrag}
//                 onDragOver={handleDrag}
//                 onDragLeave={handleDrag}
//                 onDrop={handleDrop}
//               >
//                 {formData.pt_info.photo_url ? (
//                   <img
//                     src={formData.pt_info.photo_url}
//                     alt="Profile"
//                     className="w-full h-full object-cover"
//                   />
//                 ) : (
//                   <UserPlus size={24} className="text-slate-400" />
//                 )}

//                 {isEditMode && (
//                   <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all rounded-full gap-1">
//                     <label
//                       className="p-1.5 bg-brand-primary text-white rounded-full hover:bg-brand-primary cursor-pointer"
//                       title="Upload"
//                     >
//                       <UploadCloud size={12} />
//                       <input
//                         type="file"
//                         className="hidden"
//                         onChange={handlePhotoUpload}
//                         accept="image/*"
//                         disabled={!isEditMode}
//                       />
//                     </label>
//                     <button
//                       onClick={startCamera}
//                       disabled={!isEditMode}
//                       className="p-1.5 bg-slate-700 text-white rounded-full hover:bg-slate-600"
//                       title="Camera"
//                     >
//                       <Camera size={12} />
//                     </button>
//                   </div>
//                 )}
//               </div>
//             </div>
//             <div className="flex flex-row">
//               {/* Title Area */}
//               <div>
//                 <h2 className="font-semibold text-slate-800">
//                   {mrnFromUrl ? "Patient Profile" : "Demographics"}
//                 </h2>
//                 <p className="text-xs font-medium text-slate-500 mt-1">
//                   {mrnFromUrl ? `Viewing record · ` : `New patient · `}
//                   Date: {new Date().toLocaleDateString("en-GB")}
//                 </p>
//               </div>

//               {/* Quick MRN Search Bar */}
//               <form
//                 onSubmit={handleSearchSubmit}
//                 className="mt-3 flex items-center bg-slate-50 border border-slate-200 px-2 py-1 shadow-inner focus-within:border-brand-primary focus-within:ring-2 focus-within:ring-brand-primary/20 transition-all w-fit"
//               >
                
//                 <input
//                   type="text"
//                   placeholder="MRN..."
//                   maxLength={6}
//                   className="bg-transparent border-none outline-none text-xs font-bold text-slate-700 w-20 px-2 py-1.5 placeholder-slate-400"
//                   value={searchInput}
//                   onChange={(e) => setSearchInput(e.target.value)}
//                   disabled={isSubmitting || isLoadingPatient}
//                 />
//                 <button
//                   type="submit"
//                   disabled={!searchInput.trim() || isSubmitting || isLoadingPatient}
//                   className="bg-brand-primary text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-full hover:bg-brand-active hover:text-brand-primary transition-colors disabled:opacity-50"
//                 >
//                   <Search size={16} className="text-slate-400" />
//                 </button>
//               </form>
//             </div>
//           </div>

//           <div className="flex items-center gap-4">
//             {mrnFromUrl && (
//               <>
//                 <div className="flex gap-2 mr-2">
//                   <button
//                     onClick={() => window.open(`/print/patient-card/${mrnFromUrl}`, "_blank")}
//                     className="bg-white border border-slate-200 text-slate-600 hover:text-[#2d258a] px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
//                   >
//                     <Printer size={14} /> Patient Card
//                   </button>
//                   <button
//                     onClick={() => window.open(`/print/demographics/${mrnFromUrl}`, "_blank")}
//                     className="bg-[#2d258a] text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-[#2d258a]/90 transition-all shadow-sm"
//                   >
//                     <FileText size={14} /> Demographics Sheet
//                   </button>
//                 </div>
//                 <div className="px-4 py-2 bg-brand-active border border-brand-active rounded-xl">
//                   <p className="text-[10px] font-black text-brand-primary uppercase tracking-widest">
//                     Medical Record Number
//                   </p>
//                   <p className="text-sm font-black text-brand-primary font-mono tracking-wider">
//                     {mrnFromUrl}
//                   </p>
//                 </div>
//               </>
//             )}

//             {!mrnFromUrl && (
//               <>
//                 <button
//                   onClick={() => window.open("/print/registration", "_blank")}
//                   className="flex items-center gap-2 px-6 py-3 rounded-2xl text-[11px] font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-brand-primary transition-all shadow-sm"
//                 >
//                   <Printer size={14} /> Print form
//                 </button>
//                 <label className="flex items-center gap-3 cursor-pointer bg-rose-50 px-6 py-3 rounded-2xl text-[11px] font-bold text-rose-800 border border-slate-200 hover:bg-rose-100 transition-all">
//                   <input
//                     type="checkbox"
//                     className="w-5 h-5 rounded-lg border-rose-300 text-rose-600 focus:ring-rose-600 transition-all"
//                     checked={formData.pt_info.is_emergency}
//                     onChange={(e) => updatePTInfo("is_emergency", e.target.checked ? "true" : "")}
//                     disabled={!isEditMode}
//                   />
//                   Emergency enroll
//                 </label>
//               </>
//             )}

//             {!isEditMode ? (
//               <button
//                 onClick={() => setIsEditMode(true)}
//                 className="bg-slate-900 text-white px-8 py-4 rounded-[24px] text-[11px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-slate-800 transition-all shadow-xl active:scale-95"
//               >
//                 <Edit3 size={18} /> Enable Editing
//               </button>
//             ) : (
//               <button
//                 onClick={handleSubmit}
//                 disabled={isSubmitting}
//                 className="bg-brand-primary text-white px-10 py-4 rounded-[24px] text-[11px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-brand-primary transition-all shadow-xl shadow-brand-active disabled:opacity-50 active:scale-95"
//               >
//                 {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
//                 {isSubmitting ? "Processing..." : mrnFromUrl ? "Update Record" : "Finalize"}
//               </button>
//             )}
//           </div>
//         </div>

//         <fieldset disabled={!isEditMode} className="px-6 w-full flex-1 flex flex-col">
//           {/* CAMERA MODAL */}
//           {isCameraOpen && (
//             <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4">
//               <div className="bg-white rounded-[40px] overflow-hidden shadow-2xl w-full max-w-2xl border-4 border-white">
//                 <div className="relative aspect-video bg-black">
//                   <video
//                     ref={videoRef}
//                     autoPlay
//                     playsInline
//                     className="w-full h-full object-cover"
//                   />
//                   <div className="absolute inset-0 border-2 border-dashed border-white/30 pointer-events-none m-8 rounded-3xl" />
//                 </div>
//                 <div className="p-8 flex items-center justify-between bg-white">
//                   <button
//                     type="button"
//                     onClick={stopCamera}
//                     className="px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-50"
//                   >
//                     Cancel
//                   </button>
//                   <button
//                     type="button"
//                     onClick={capturePhoto}
//                     className="w-16 h-16 bg-brand-primary rounded-full flex items-center justify-center text-white shadow-xl shadow-brand-active hover:scale-110 transition-transform active:scale-95"
//                   >
//                     <Camera size={32} />
//                   </button>
//                   <div className="w-20" />
//                 </div>
//               </div>
//             </div>
//           )}

//           {/* ===================== ROW 1: DEMOGRAPHICS (ALWAYS VISIBLE) ===================== */}
//           <div className="grid grid-cols-12 gap-6 mb-6 shrink-0">
//             {/* COL 1 — Personal Information */}
//             <div className="col-span-12 md:col-span-4 bg-brand-active/30 rounded-3xl p-6 border border-brand-active shadow-sm">
//               <div className="flex items-center gap-2 mb-4">
//                 <div className="w-1 h-5 bg-brand-primary rounded-full"></div>
//                 <h3 className="text-sm font-black text-slate-800">Personal information</h3>
//               </div>
//               <div className="grid grid-cols-2 gap-2">
//                 {/* First Name */}
//                 <div className="space-y-0.5">
//                   <label className="text-[10px] font-bold text-slate-500 ml-0.5">First name *</label>
//                   <input
//                     type="text"
//                     className={`w-full px-2 py-1.5 bg-white border rounded text-xs font-bold outline-none focus:border-brand-primary ${
//                       errors.first_name ? "border-red-400" : "border-slate-200"
//                     }`}
//                     value={formData.pt_info.first_name || ""}
//                     onChange={(e) => updatePTInfo("first_name", e.target.value)}
//                   />
//                 </div>
//                 {/* Middle Name */}
//                 <div className="space-y-0.5">
//                   <label className="text-[10px] font-bold text-slate-500 ml-0.5">Middle name</label>
//                   <input
//                     type="text"
//                     className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold outline-none focus:border-brand-primary"
//                     value={formData.pt_info.middle_name || ""}
//                     onChange={(e) => updatePTInfo("middle_name", e.target.value)}
//                   />
//                 </div>
//                 {/* Last Name */}
//                 <div className="space-y-0.5">
//                   <label className="text-[10px] font-bold text-slate-500 ml-0.5">Last name *</label>
//                   <input
//                     type="text"
//                     className={`w-full px-2 py-1.5 bg-white border rounded text-xs font-bold outline-none focus:border-brand-primary ${
//                       errors.last_name ? "border-red-400" : "border-slate-200"
//                     }`}
//                     value={formData.pt_info.last_name || ""}
//                     onChange={(e) => updatePTInfo("last_name", e.target.value)}
//                   />
//                 </div>
//                 {/* Gender */}
//                 <div className="space-y-0.5">
//                   <label className="text-[10px] font-bold text-slate-500 ml-0.5">Gender {!isEmergency && '*'}</label>
//                   <select
//                     className={`w-full px-2 py-1.5 bg-white border rounded text-xs font-bold outline-none ${
//                       errors.gender ? "border-red-400" : "border-slate-200"
//                     }`}
//                     value={formData.pt_info.gender || ""}
//                     onChange={(e) => updatePTInfo("gender", e.target.value)}
//                   >
//                     <option value="">—</option>
//                     <option value="Male">Male</option>
//                     <option value="Female">Female</option>
//                   </select>
//                 </div>
//                 {/* DOB */}
//                 <div className="space-y-0.5">
//                   <label className="text-[10px] font-bold text-slate-500 ml-0.5">Date of birth {!isEmergency && '*'}</label>
//                   <input
//                     type="date"
//                     className={`w-full px-2 py-1.5 bg-white border rounded text-xs font-bold outline-none ${
//                       errors.dob ? "border-red-400" : "border-slate-200"
//                     }`}
//                     value={formData.pt_info.date_of_birth || ""}
//                     onChange={(e) => updatePTInfo("date_of_birth", e.target.value)}
//                   />
//                 </div>
//                 {/* Age */}
//                 <div className="space-y-0.5">
//                   <label className="text-[10px] font-bold text-slate-500 ml-0.5">Age (Y-M-D)</label>
//                   <div className="w-full px-2 py-1.5 bg-slate-100 border border-slate-100 rounded text-xs font-black text-brand-primary flex items-center min-h-[30px]">
//                     {calculateAge(formData.pt_info.date_of_birth) || "—"}
//                   </div>
//                 </div>
//                 {/* Marital Status */}
//                 <div className="space-y-0.5">
//                   <label className="text-[10px] font-bold text-slate-500 ml-0.5">Marital status</label>
//                   <select
//                     className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold outline-none"
//                     value={formData.pt_info.marital_status || ""}
//                     onChange={(e) => updatePTInfo("marital_status", e.target.value)}
//                   >
//                     <option value="">—</option>
//                     <option value="Single">Single</option>
//                     <option value="Married">Married</option>
//                     <option value="Divorced">Divorced</option>
//                     <option value="Widowed">Widowed</option>
//                   </select>
//                 </div>
//                 {/* Nationality */}
//                 <div className="space-y-0.5">
//                   <label className="text-[10px] font-bold text-slate-500 ml-0.5">Nationality</label>
//                   <SearchableSelect
//                     options={countries.map((c) => c.name)}
//                     value={formData.pt_info.nationality}
//                     onChange={handleCountryChange}
//                     placeholder="Select Country"
//                     disabled={!isEditMode}
//                   />
//                 </div>
//                 {/* State */}
//                 <div className="space-y-0.5">
//                   <label className="text-[10px] font-bold text-slate-500 ml-0.5">State of origin</label>
//                   {locationData[formData.pt_info.nationality] ? (
//                     <SearchableSelect
//                       options={Object.keys(locationData[formData.pt_info.nationality])}
//                       value={formData.pt_info.state_of_origin}
//                       onChange={handleStateChange}
//                       placeholder="Select State"
//                       disabled={!isEditMode}
//                     />
//                   ) : (
//                     <input
//                       type="text"
//                       className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold outline-none focus:border-brand-primary"
//                       value={formData.pt_info.state_of_origin}
//                       onChange={(e) => handleStateChange(e.target.value)}
//                       disabled={!isEditMode}
//                     />
//                   )}
//                 </div>
//                 {/* LGA */}
//                 <div className="space-y-0.5">
//                   <label className="text-[10px] font-bold text-slate-500 ml-0.5">LGA / City</label>
//                   {locationData[formData.pt_info.nationality]?.[formData.pt_info.state_of_origin] ? (
//                     <SearchableSelect
//                       options={
//                         locationData[formData.pt_info.nationality][formData.pt_info.state_of_origin]
//                       }
//                       value={formData.pt_info.lga}
//                       onChange={(val) => updatePTInfo("lga", val)}
//                       placeholder="Select LGA"
//                       disabled={!isEditMode || !formData.pt_info.state_of_origin}
//                     />
//                   ) : (
//                     <input
//                       type="text"
//                       className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold outline-none focus:border-brand-primary"
//                       value={formData.pt_info.lga}
//                       onChange={(e) => updatePTInfo("lga", e.target.value)}
//                       disabled={!isEditMode}
//                     />
//                   )}
//                 </div>
//               </div>
//             </div>

//             {/* COL 2 — Contact Information */}
//             <div className="col-span-12 md:col-span-4">
//               <div className="bg-indigo-50/30 rounded-3xl p-4 border border-slate-200 h-full">
//                 <div className="flex items-center gap-2 mb-2">
//                   <div className="w-5 h-5 bg-indigo-600 rounded-md flex items-center justify-center">
//                     <Phone className="text-white" size={12} />
//                   </div>
//                   <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest">
//                     Contact information
//                   </h3>
//                 </div>
//                 <div className="grid grid-cols-2 gap-2 mt-4">
//                   <div className="col-span-2 space-y-0.5">
//                     <label className="text-[10px] font-bold text-slate-500 ml-0.5">
//                       Phone number {!isEmergency && '*'}
//                     </label>
//                     <input
//                       type="tel"
//                       className={`w-full px-2 py-1.5 bg-white border rounded text-xs font-bold outline-none focus:border-brand-primary ${
//                         errors.phone ? "border-red-400" : "border-slate-200"
//                       }`}
//                       value={formData.pt_info.phone || ""}
//                       onChange={(e) =>
//                         handlePhoneInput(e.target.value, (val) => updatePTInfo("phone", val))
//                       }
//                     />
//                   </div>
//                   <div className="col-span-2 space-y-0.5">
//                     <label className="text-[10px] font-bold text-slate-500 ml-0.5">
//                       Email address
//                     </label>
//                     <input
//                       type="email"
//                       className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold outline-none focus:border-brand-primary"
//                       value={formData.pt_info.email || ""}
//                       onChange={(e) => updatePTInfo("email", e.target.value)}
//                     />
//                   </div>
//                   <div className="col-span-2 space-y-0.5">
//                     <label className="text-[10px] font-bold text-slate-500 ml-0.5">
//                       Residential address {!isEmergency && '*'}
//                     </label>
//                     <input
//                       type="text"
//                       className={`w-full px-2 py-1.5 bg-white border rounded text-xs font-bold outline-none focus:border-brand-primary ${
//                         errors.address ? "border-red-400" : "border-slate-200"
//                       }`}
//                       value={formData.pt_info.address || ""}
//                       onChange={(e) => updatePTInfo("address", e.target.value)}
//                     />
//                   </div>
//                 </div>
//               </div>
//             </div>

//             {/* COL 3 — Next of Kin */}
//             <div className="col-span-12 md:col-span-4">
//               <div className="bg-indigo-50/30 rounded-3xl p-4 border border-slate-200 h-full">
//                 <div className="flex items-center gap-2 mb-4">
//                   <div className="w-1 h-5 bg-indigo-600 rounded-full"></div>
//                   <h3 className="text-sm font-black text-slate-800">Next of kin</h3>
//                 </div>
//                 <div className="grid grid-cols-2 gap-2">
//                   <div className="col-span-2 space-y-0.5">
//                     <label className="text-[10px] font-bold text-slate-500 ml-0.5">
//                       Full name {!isEmergency && '*'}
//                     </label>
//                     <input
//                       type="text"
//                       className={`w-full px-2 py-1.5 bg-white border rounded text-xs font-bold outline-none focus:border-brand-primary ${
//                         errors.next_of_kin_name ? "border-red-400" : "border-slate-200"
//                       }`}
//                       value={formData.pt_info.nok_full_name || ""}
//                       onChange={(e) => updateNextOfKin("nok_full_name", e.target.value)}
//                     />
//                   </div>
//                   <div className="space-y-0.5">
//                     <label className="text-[10px] font-bold text-slate-500 ml-0.5">
//                       Relationship
//                     </label>
//                     <input
//                       type="text"
//                       className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold outline-none focus:border-brand-primary"
//                       value={formData.pt_info.nok_relationship || ""}
//                       onChange={(e) => updateNextOfKin("nok_relationship", e.target.value)}
//                     />
//                   </div>
//                   <div className="space-y-0.5">
//                     <label className="text-[10px] font-bold text-slate-500 ml-0.5">Phone {!isEmergency && '*'}</label>
//                     <input
//                       type="tel"
//                       className={`w-full px-2 py-1.5 bg-white border rounded text-xs font-bold outline-none focus:border-brand-primary ${
//                         errors.next_of_kin_phone ? "border-red-400" : "border-slate-200"
//                       }`}
//                       value={formData.pt_info.nok_phone || ""}
//                       onChange={(e) =>
//                         handlePhoneInput(e.target.value, (val) =>
//                           updateNextOfKin("nok_phone", val)
//                         )
//                       }
//                     />
//                   </div>
//                   <div className="space-y-0.5">
//                     <label className="text-[10px] font-bold text-slate-500 ml-0.5">
//                       Alt. phone
//                     </label>
//                     <input
//                       type="tel"
//                       className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold outline-none focus:border-brand-primary"
//                       value={formData.pt_info.nok_alternate_phone || ""}
//                       onChange={(e) =>
//                         handlePhoneInput(e.target.value, (val) =>
//                           updateNextOfKin("nok_alternate_phone", val)
//                         )
//                       }
//                     />
//                   </div>
//                   <div className="col-span-2 space-y-0.5">
//                     <div className="flex items-center justify-between">
//                       <label className="text-[10px] font-bold text-slate-500 ml-0.5">Address</label>
//                       <button
//                         type="button"
//                         onClick={() => updateNextOfKin("nok_address", formData.pt_info.address)}
//                         className="text-[8px] font-black text-indigo-500 uppercase hover:text-indigo-700 transition-colors"
//                       >
//                         Same as patient
//                       </button>
//                     </div>
//                     <input
//                       type="text"
//                       className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold outline-none focus:border-brand-primary"
//                       value={formData.pt_info.nok_address || ""}
//                       onChange={(e) => updateNextOfKin("nok_address", e.target.value)}
//                     />
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* ===================== TAB BAR FOR ROW 2 ===================== */}
//           <div className="flex items-center gap-2 border-b-2 border-slate-100 mb-6 shrink-0 mt-4 px-2">
//             <button
//               type="button"
//               onClick={() => setActiveBottomTab("clinical")}
//               className={`px-8 py-3.5 text-[11px] font-black uppercase tracking-widest transition-all rounded-t-xl ${
//                 activeBottomTab === "clinical"
//                   ? "border-b-4 border-rose-600 text-rose-700 bg-rose-50/50"
//                   : "border-b-4 border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50"
//               }`}
//             >
//               Emergency & Clinical Data
//             </button>
//             <button
//               type="button"
//               onClick={() => setActiveBottomTab("consent")}
//               className={`px-8 py-3.5 text-[11px] font-black uppercase tracking-widest transition-all rounded-t-xl ${
//                 activeBottomTab === "consent"
//                   ? "border-b-4 border-rose-600 text-rose-700 bg-rose-50/50"
//                   : "border-b-4 border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50"
//               }`}
//             >
//               Acquisition & NDPA Consents
//             </button>
//           </div>

//           {/* ===================== ROW 2 ===================== */}
//           <div className="flex-1 overflow-y-auto hide-scrollbar pb-6 px-1">
//             {/* --- TAB 1 CONTENT: CLINICAL & EMERGENCY --- */}
//             {activeBottomTab === "clinical" && (
//               <div className="grid grid-cols-12 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
//                 {/* COL 1 — Emergency Contact */}
//                 <div className="col-span-12 md:col-span-4 bg-[#FAFAFA] rounded-3xl p-6 border border-[#EEEDFE]">
//                   <div className="flex items-center gap-2 mb-4">
//                     <div className="w-1 h-5 bg-brand-primary rounded-full"></div>
//                     <h3 className="text-sm font-black text-slate-800">Emergency contact</h3>
//                   </div>
//                   <div className="grid grid-cols-2 gap-2 mt-4">
//                     <div className="col-span-2 space-y-0.5">
//                       <label className="text-[10px] font-bold text-slate-500 ml-0.5">
//                         Full name {!isEmergency && '*'}
//                       </label>
//                       <input
//                         type="text"
//                         className={`w-full px-2 py-1.5 bg-white border rounded text-xs font-bold outline-none focus:border-brand-primary ${
//                           errors.emergency_contact_name ? "border-red-400" : "border-slate-200"
//                         }`}
//                         value={formData.emergency_contacts[0].full_name || ""}
//                         onChange={(e) => updateEmergency("full_name", e.target.value)}
//                       />
//                     </div>
//                     <div className="space-y-0.5">
//                       <label className="text-[10px] font-bold text-slate-500 ml-0.5">
//                         Relationship
//                       </label>
//                       <input
//                         type="text"
//                         className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold outline-none focus:border-brand-primary"
//                         value={formData.emergency_contacts[0].relationship || ""}
//                         onChange={(e) => updateEmergency("relationship", e.target.value)}
//                       />
//                     </div>
//                     <div className="space-y-0.5">
//                       <label className="text-[10px] font-bold text-slate-500 ml-0.5">Phone {!isEmergency && '*'}</label>
//                       <input
//                         type="tel"
//                         className={`w-full px-2 py-1.5 bg-white border rounded text-xs font-bold outline-none focus:border-brand-primary ${
//                           errors.emergency_contact_phone ? "border-red-400" : "border-slate-200"
//                         }`}
//                         value={formData.emergency_contacts[0].phone || ""}
//                         onChange={(e) =>
//                           handlePhoneInput(e.target.value, (val) => updateEmergency("phone", val))
//                         }
//                       />
//                     </div>
//                     <div className="space-y-0.5">
//                       <label className="text-[10px] font-bold text-slate-500 ml-0.5">
//                         Alt. phone
//                       </label>
//                       <input
//                         type="tel"
//                         className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold outline-none focus:border-brand-primary"
//                         value={formData.emergency_contacts[0].alternate_phone || ""}
//                         onChange={(e) =>
//                           handlePhoneInput(e.target.value, (val) =>
//                             updateEmergency("alternate_phone", val)
//                           )
//                         }
//                       />
//                     </div>
//                     <div className="col-span-2 space-y-0.5">
//                       <label className="text-[10px] font-bold text-slate-500 ml-0.5">Address</label>
//                       <input
//                         type="text"
//                         className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold outline-none focus:border-brand-primary"
//                         value={formData.emergency_contacts[0].address || ""}
//                         onChange={(e) => updateEmergency("address", e.target.value)}
//                       />
//                     </div>
//                   </div>
//                 </div>

//                 {/* COL 2 — Payer Information */}
//                 <div className="col-span-12 md:col-span-4 bg-[#FAFAFA] rounded-3xl p-6 border border-[#EEEDFE]">
//                   <div className="flex items-center gap-2 mb-4">
//                     <div className="w-1 h-5 bg-brand-primary rounded-full"></div>
//                     <h3 className="text-sm font-black text-slate-800">Payer information</h3>
//                   </div>
//                   <div className="grid grid-cols-2 gap-2 mt-4">
//                     <div className="space-y-0.5">
//                       <label className="text-[10px] font-bold text-slate-500 ml-0.5">
//                         Payer type {!isEmergency && '*'}
//                       </label>
//                       <select
//                         className={`w-full px-2 py-1.5 bg-white border rounded text-xs font-black outline-none ${
//                           errors.payer_type ? "border-red-400" : "border-slate-200"
//                         }`}
//                         value={formData.payer.payer_type || ""}
//                         onChange={handlePayerTypeChange}
//                       >
//                         <option value="">Select type</option>
//                         {payerTypes.map((t) => (
//                           <option key={t.id} value={t.code}>
//                             {t.name}
//                           </option>
//                         ))}
//                       </select>
//                     </div>
//                     <div className="space-y-0.5">
//                       <label className="text-[10px] font-bold text-slate-500 ml-0.5">
//                         Policy number
//                       </label>
//                       <input
//                         type="text"
//                         placeholder="Optional"
//                         className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold outline-none focus:border-brand-primary"
//                         value={formData.payer.policy_number || ""}
//                         onChange={(e) =>
//                           setFormData({
//                             ...formData,
//                             payer: {
//                               ...formData.payer,
//                               policy_number: e.target.value,
//                             },
//                           })
//                         }
//                       />
//                     </div>
//                     <div className="col-span-2 space-y-0.5">
//                       <label className="text-[10px] font-bold text-slate-500 ml-0.5">
//                         Provider / payer {!isEmergency && '*'}
//                       </label>
//                       <select
//                         disabled={!formData.payer.payer_type || loadingPayers}
//                         className={`w-full px-2 py-1.5 bg-white border rounded text-xs font-black outline-none ${
//                           errors.payer_id ? "border-red-400" : "border-slate-200"
//                         }`}
//                         value={formData.payer.payer_id || ""}
//                         onChange={(e) =>
//                           setFormData({
//                             ...formData,
//                             payer: {
//                               ...formData.payer,
//                               payer_id: parseInt(e.target.value),
//                             },
//                           })
//                         }
//                       >
//                         <option value="">
//                           {loadingPayers ? "Loading..." : "Select provider"}
//                         </option>
//                         {availablePayers.map((p) => (
//                           <option key={p.id} value={p.id}>
//                             {p.name}
//                           </option>
//                         ))}
//                       </select>
//                     </div>
//                   </div>
//                 </div>

//                 {/* COL 3 — Medical Info */}
//                 <div className="col-span-12 md:col-span-4 bg-[#FAFAFA] rounded-3xl p-6 border border-[#EEEDFE]">
//                   <div className="flex items-center gap-2 mb-4">
//                     <div className="w-1 h-5 bg-brand-primary rounded-full"></div>
//                     <h3 className="text-sm font-black text-slate-800">Medical info</h3>
//                   </div>
//                   <div className="grid grid-cols-2 gap-2 mt-4">
//                     <div className="space-y-0.5">
//                       <label className="text-[10px] font-bold text-slate-500 ml-0.5">
//                         Blood group
//                       </label>
//                       <select
//                         className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold outline-none"
//                         value={formData.medical_profile.blood_group || ""}
//                         onChange={(e) => updateMedical("blood_group", e.target.value)}
//                       >
//                         <option value="">—</option>
//                         {["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"].map((bg) => (
//                           <option key={bg}>{bg}</option>
//                         ))}
//                       </select>
//                     </div>
//                     <div className="space-y-0.5">
//                       <label className="text-[10px] font-bold text-slate-500 ml-0.5">Genotype</label>
//                       <select
//                         className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold outline-none"
//                         value={formData.medical_profile.genotype || ""}
//                         onChange={(e) => updateMedical("genotype", e.target.value)}
//                       >
//                         <option value="">—</option>
//                         {["AA", "AS", "SS", "AC", "SC"].map((g) => (
//                           <option key={g}>{g}</option>
//                         ))}
//                       </select>
//                     </div>
//                     <div className="col-span-2 space-y-0.5">
//                       <label className="text-[10px] font-bold text-slate-500 ml-0.5">
//                         Known allergies
//                       </label>
//                       <input
//                         type="text"
//                         className="w-full px-2 py-1.5 bg-white border border-slate-200 focus:border-brand-primary rounded-lg text-xs"
//                         placeholder="None"
//                         value={formData.medical_profile.known_allergies || ""}
//                         onChange={(e) => updateMedical("known_allergies", e.target.value)}
//                       />
//                     </div>
//                     <div className="col-span-2 space-y-0.5">
//                       <label className="text-[10px] font-bold text-slate-500 ml-0.5">
//                         Chronic conditions
//                       </label>
//                       <input
//                         type="text"
//                         className="w-full px-2 py-1.5 bg-white border border-slate-200 focus:border-brand-primary rounded-lg text-xs"
//                         placeholder="None"
//                         value={formData.medical_profile.chronic_conditions || ""}
//                         onChange={(e) => updateMedical("chronic_conditions", e.target.value)}
//                       />
//                     </div>
//                     <div className="col-span-2 space-y-0.5">
//                       <label className="text-[10px] font-bold text-slate-500 ml-0.5">
//                         Special alerts
//                       </label>
//                       <textarea
//                         className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-brand-primary h-10 resize-none"
//                         placeholder="None"
//                         value={formData.medical_profile.special_alerts || ""}
//                         onChange={(e) => updateMedical("special_alerts", e.target.value)}
//                       />
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             )}

//             {/* --- TAB 2 CONTENT: MARKETING & NDPA CONSENT --- */}
//             {activeBottomTab === "consent" && (
//               <div className="grid grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
//                 {/* Acquisition Tracking */}
//                 <div className="col-span-12 md:col-span-4 bg-amber-50/50 p-6 rounded-3xl border border-amber-200/70 shadow-sm h-min">
//                   <div className="flex items-center gap-3 mb-6 border-b border-amber-200/40 pb-4">
//                     <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0">
//                       <Target size={20} />
//                     </div>
//                     <div>
//                       <h3 className="text-sm font-black text-slate-800">Acquisition Tracking</h3>
//                       <p className="text-[10px] text-slate-500 mt-0.5">
//                         Record hospital discovery channel.
//                       </p>
//                     </div>
//                   </div>

//                   <div className="grid grid-cols-1 gap-y-4">
//                     <div>
//                       <label className="text-[10px] font-bold text-slate-600">
//                         Referral Channel *
//                       </label>
//                       <select
//                         className="w-full mt-1 px-3 py-2.5 bg-white border border-amber-200 rounded-xl text-xs font-bold outline-none"
//                         value={formData.referral.referral_source_id}
//                         onChange={(e) =>
//                           updateReferral("referral_source_id", parseInt(e.target.value))
//                         }
//                       >
//                         {referralSources.map((s) => (
//                           <option key={s.id} value={s.id}>
//                             {s.name}
//                           </option>
//                         ))}
//                       </select>
//                     </div>

//                     {activeReferralCode === "DOCTOR_REFERRAL" && (
//                       <div>
//                         <label className="text-[10px] font-bold text-slate-600">
//                           Referring Physician Name
//                         </label>
//                         <input
//                           type="text"
//                           placeholder="Dr. Full Name"
//                           className="w-full mt-1 px-3 py-2.5 bg-white border border-amber-200 rounded-xl text-xs font-semibold"
//                           value={formData.referral.referring_doctor_name}
//                           onChange={(e) => updateReferral("referring_doctor_name", e.target.value)}
//                         />
//                       </div>
//                     )}

//                     {(activeReferralCode === "HOSPITAL_FACILITY" ||
//                       activeReferralCode === "DOCTOR_REFERRAL") && (
//                       <div>
//                         <label className="text-[10px] font-bold text-slate-600">
//                           Referring Facility / Hospital
//                         </label>
//                         <input
//                           type="text"
//                           placeholder="Clinic / Center Name"
//                           className="w-full mt-1 px-3 py-2.5 bg-white border border-amber-200 rounded-xl text-xs font-semibold"
//                           value={formData.referral.referring_facility_name}
//                           onChange={(e) =>
//                             updateReferral("referring_facility_name", e.target.value)
//                           }
//                         />
//                       </div>
//                     )}

//                     {activeReferralCode === "FAMILY_FRIEND" && (
//                       <div>
//                         <label className="text-[10px] font-bold text-slate-600">
//                           Referred by (Name / MRN)
//                         </label>
//                         <input
//                           type="text"
//                           placeholder="Name or Patient MRN"
//                           className="w-full mt-1 px-3 py-2.5 bg-white border border-amber-200 rounded-xl text-xs font-semibold"
//                           value={formData.referral.referred_by_name}
//                           onChange={(e) => updateReferral("referred_by_name", e.target.value)}
//                         />
//                       </div>
//                     )}

//                     {activeReferralCode === "SOCIAL_MEDIA" && (
//                       <div>
//                         <label className="text-[10px] font-bold text-slate-600">
//                           Platform / Channel
//                         </label>
//                         <input
//                           type="text"
//                           placeholder="E.g. Instagram, Facebook, LinkedIn"
//                           className="w-full mt-1 px-3 py-2.5 bg-white border border-amber-200 rounded-xl text-xs font-semibold"
//                           value={formData.referral.referral_channel_detail}
//                           onChange={(e) =>
//                             updateReferral("referral_channel_detail", e.target.value)
//                           }
//                         />
//                       </div>
//                     )}

//                     <div>
//                       <label className="text-[10px] font-bold text-slate-600">
//                         Campaign / Promo Code
//                       </label>
//                       <input
//                         type="text"
//                         placeholder="Optional Code"
//                         className="w-full mt-1 px-3 py-2.5 bg-white border border-amber-200 rounded-xl text-xs font-semibold"
//                         value={formData.referral.campaign_code}
//                         onChange={(e) => updateReferral("campaign_code", e.target.value)}
//                       />
//                     </div>
//                     <div>
//                       <label className="text-[10px] font-bold text-slate-600">
//                         Attribution Notes
//                       </label>
//                       <input
//                         type="text"
//                         placeholder="Additional context"
//                         className="w-full mt-1 px-3 py-2.5 bg-white border border-amber-200 rounded-xl text-xs font-semibold"
//                         value={formData.referral.notes}
//                         onChange={(e) => updateReferral("notes", e.target.value)}
//                       />
//                     </div>
//                   </div>
//                 </div>

//                 {/* NDPA Consent Form */}
//                 <div className="col-span-12 md:col-span-8 bg-slate-50/80 p-6 rounded-3xl border border-slate-200 flex flex-col justify-between shadow-sm">
//                   {/* Header */}
//                   <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-4 mb-5 gap-3">
//                     <div className="flex items-center gap-3">
//                       <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
//                         <ShieldCheck size={22} />
//                       </div>
//                       <div>
//                         <h3 className="text-sm font-black text-slate-800">
//                           Information Sharing Consent Form
//                         </h3>
//                         <p className="text-[10px] text-slate-500 mt-0.5">
//                           Governed under NDPA. Patients may revoke preferences in writing.
//                         </p>
//                       </div>
//                     </div>
//                     <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full border border-emerald-200 shrink-0">
//                       NDPA 2023 Standard
//                     </span>
//                   </div>

//                   <div className="grid grid-cols-12 gap-5 mb-5">
//                     {/* Preferences & Shareable Data */}
//                     <div className="col-span-12 lg:col-span-5 flex flex-col gap-4">
//                       {/* Section B */}
//                       <div className="bg-white p-4 rounded-2xl border border-slate-200 flex-1">
//                         <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3">
//                           Your Disclosure Preference
//                         </h4>
//                         <div className="space-y-2.5">
//                           {[
//                             {
//                               key: "pref_do_not_share",
//                               label: "Do NOT share my medical information with anyone.",
//                             },
//                             {
//                               key: "pref_share_listed",
//                               label: "Share my medical info only with the person(s) listed below.",
//                             },
//                             {
//                               key: "pref_share_family",
//                               label: "Share my medical information with immediate family members.",
//                             },
//                             {
//                               key: "pref_share_caregiver",
//                               label: "Share my medical information with my caregiver(s).",
//                             },
//                             {
//                               key: "pref_discuss_present",
//                               label: "Discuss my medical information only when I am present.",
//                             },
//                             {
//                               key: "pref_emergency_listed",
//                               label: "In an emergency, share info with person(s) listed below.",
//                             },
//                           ].map((item) => (
//                             <label
//                               key={item.key}
//                               className="flex items-start gap-2.5 cursor-pointer group"
//                             >
//                               <input
//                                 type="checkbox"
//                                 className="mt-0.5 rounded text-brand-primary focus:ring-brand-primary"
//                                 checked={(formData.disclosure_consent as any)[item.key]}
//                                 onChange={() => toggleConsentPref(item.key)}
//                               />
//                               <span className="text-[11px] font-semibold text-slate-600 group-hover:text-brand-primary transition-colors leading-snug">
//                                 {item.label}
//                               </span>
//                             </label>
//                           ))}
//                         </div>
//                       </div>

//                       {/* Section D */}
//                       <div className="bg-white p-4 rounded-2xl border border-slate-200">
//                         <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3">
//                           Information That May Be Shared
//                         </h4>
//                         <div className="grid grid-cols-2 gap-y-3 gap-x-2">
//                           {[
//                             { key: "info_diagnosis", label: "Diagnosis" },
//                             { key: "info_test_results", label: "Test Results" },
//                             { key: "info_treatment_plan", label: "Treatment Plan" },
//                             { key: "info_medication", label: "Medications" },
//                             { key: "info_surgical_procedures", label: "Surgeries" },
//                             { key: "info_progress_updates", label: "Progress" },
//                             { key: "info_discharge_plans", label: "Discharge Plans" },
//                             { key: "info_billing", label: "Billing Info" },
//                             { key: "info_all", label: "All of the Above", highlight: true },
//                           ].map((info) => (
//                             <label
//                               key={info.key}
//                               className="flex items-center gap-2 cursor-pointer group"
//                             >
//                               <input
//                                 type="checkbox"
//                                 className="rounded text-brand-primary focus:ring-brand-primary"
//                                 checked={(formData.disclosure_consent as any)[info.key]}
//                                 onChange={() => toggleConsentInfo(info.key)}
//                               />
//                               <span
//                                 className={`text-[10px] font-semibold group-hover:text-brand-primary ${
//                                   info.highlight
//                                     ? "text-brand-primary font-black"
//                                     : "text-slate-600"
//                                 }`}
//                               >
//                                 {info.label}
//                               </span>
//                             </label>
//                           ))}
//                         </div>
//                       </div>
//                     </div>

//                     {/* Section C: Authorised Persons */}
//                     <div className="col-span-12 lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 flex flex-col">
//                       <div className="flex items-center justify-between mb-4">
//                         <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
//                           <Users size={14} /> Authorised Persons (Up to 3 Individuals)
//                         </h4>
//                       </div>
//                       <div className="space-y-4 flex-1">
//                         {formData.authorized_persons.map((person, idx) => (
//                           <div
//                             key={idx}
//                             className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200"
//                           >
//                             <p className="text-[11px] font-black text-brand-primary mb-2.5">
//                               Authorised Person {idx + 1}
//                             </p>
//                             <div className="grid grid-cols-12 gap-3">
//                               <div className="col-span-12">
//                                 <input
//                                   type="text"
//                                   placeholder="Full Legal Name"
//                                   className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:border-brand-primary outline-none"
//                                   value={person.full_name}
//                                   onChange={(e) =>
//                                     updateAuthPerson(idx, "full_name", e.target.value)
//                                   }
//                                 />
//                               </div>
//                               <div className="col-span-6">
//                                 <input
//                                   type="text"
//                                   placeholder="Relationship (e.g. Spouse)"
//                                   className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:border-brand-primary outline-none"
//                                   value={person.relationship}
//                                   onChange={(e) =>
//                                     updateAuthPerson(idx, "relationship", e.target.value)
//                                   }
//                                 />
//                               </div>
//                               <div className="col-span-6">
//                                 <input
//                                   type="tel"
//                                   placeholder="Phone Number"
//                                   className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:border-brand-primary outline-none"
//                                   value={person.phone}
//                                   onChange={(e) =>
//                                     handlePhoneInput(e.target.value, (val) =>
//                                       updateAuthPerson(idx, "phone", val)
//                                     )
//                                   }
//                                 />
//                               </div>
//                             </div>
//                           </div>
//                         ))}
//                       </div>
//                     </div>
//                   </div>

//                   {/* Section E: Patient Declaration & Signature Block */}
//                   <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100 flex flex-col xl:flex-row items-center justify-between gap-6">
//                     <div className="space-y-1.5 flex-1">
//                       <p className="text-xs font-black text-slate-800">E · Patient Declaration</p>
//                       <p className="text-[10px] text-slate-600 leading-relaxed max-w-lg">
//                         "I confirm the preferences recorded above reflect my wishes. I understand
//                         that I may withdraw or change this consent at any time by notifying
//                         Gracespring Hospitals in writing."
//                       </p>
//                     </div>

//                     {/* Signature Pad Integrations */}
//                     <div className="flex flex-wrap gap-4 shrink-0">
//                       {/* Patient Signature */}
//                       <div className="flex flex-col gap-1 w-32 h-20 relative">
//                         <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">
//                           Patient Signature
//                         </span>
//                         <SignaturePad
//                           className="bg-white border-2 border-emerald-200/60 rounded-xl overflow-hidden shadow-sm"
//                           initialDataUrl={formData.disclosure_consent.patient_signature_data}
//                           onEnd={(data) =>
//                             setFormData((prev) => ({
//                               ...prev,
//                               disclosure_consent: {
//                                 ...prev.disclosure_consent,
//                                 patient_signature_data: data,
//                                 patient_signed: true,
//                               },
//                             }))
//                           }
//                           onClear={() =>
//                             setFormData((prev) => ({
//                               ...prev,
//                               disclosure_consent: {
//                                 ...prev.disclosure_consent,
//                                 patient_signature_data: "",
//                                 patient_signed: false,
//                               },
//                             }))
//                           }
//                         />
//                       </div>

//                       {/* Staff/Witness Signature */}
//                       <div className="flex flex-col gap-1 w-32 h-20 relative">
//                         <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">
//                           Witness Signature
//                         </span>
//                         <SignaturePad
//                           className="bg-white border-2 border-emerald-200/60 rounded-xl overflow-hidden shadow-sm"
//                           initialDataUrl={formData.disclosure_consent.witness_signature_data}
//                           onEnd={(data) =>
//                             setFormData((prev) => ({
//                               ...prev,
//                               disclosure_consent: {
//                                 ...prev.disclosure_consent,
//                                 witness_signature_data: data,
//                                 witness_signed: true,
//                               },
//                             }))
//                           }
//                           onClear={() =>
//                             setFormData((prev) => ({
//                               ...prev,
//                               disclosure_consent: {
//                                 ...prev.disclosure_consent,
//                                 witness_signature_data: "",
//                                 witness_signed: false,
//                               },
//                             }))
//                           }
//                         />
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             )}
//           </div>

//           <style
//             dangerouslySetInnerHTML={{
//               __html: `
//             .hide-scrollbar::-webkit-scrollbar { display: none; }
//             .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
//           `,
//             }}
//           />

//           <canvas ref={canvasRef} className="hidden" />
//         </fieldset>
//       </div>
//     </div>
//   );
// };

// export default PatientRegistration;
