using System.Drawing;

namespace Kasir;

// Logo Toko Berkah ditanam langsung di kode (tidak perlu file Assets / csproj).
public static class LogoToko
{
    static Image gambar;
    static bool sudahDicoba;

    const string Data =
            "iVBORw0KGgoAAAANSUhEUgAAAeAAAACxCAMAAAArr55BAAABgFBMVEUAAAABp/oAh/oAmPoAt/oAx/oA//8AePoA1fsAfv4Aqf4A" +
            "vP0AAP8AmPwAbPoAyvwApvwAl/oBqPsAh/wAVf8A5P4Bx/wApvwCtvoBuPwBhvsAyPwCqPkBl/sBp/wA1voAd/oBiPoBmPsBpvsA" +
            "l/wBxfsCtvsBiPoAl/wBx/sAtvwAmPwBx/sBivcBt/wAxfwAZ/sBt/sAePkAefoAevgAdfoA1fwAh/wB2PwAf38AefwAl9QAqqoB" +
            "1vsA5v0Af78B1/gA1vwAifsA2PoAf9cAv78AZ84AP78APP8AVaoAWNYAqtQA4vwAbPkAt9kA5PwAAH8AbPYB4fwAbPwAzMwA5PYA" +
            "4vsAbv0B4fsA/38A/wAAM8wBa/kA19cASNoA/6oA8P8/f79/f/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwiqPuAAAAgHRSTlMA/Pz7+/sB/PsEBQcB" +
            "CfwKrC9SzgP80o4uzW2VL03NDMoubm/NLU9Sr1CwjG8Sj64Ib2RRLLbOrokCkQYDUM0EL6+QbQYEBQQEAwcGkk0IrwIsTa8FDi3I" +
            "cwIBBXYGBwP/BAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABnOZfMAACtgSURBVHja7X0LQxrJtm5BQ2lVdwdQBFREUVBE" +
            "UYxGYzTbmEkyM5nZ89hnzzln7/O89///iLuqql/16i4UZ64OlcSYoNhdX69V6/kthP7/Wtivsb9oSOEj8TFarBe1KCDa2T8Zwzo5" +
            "2wesFwi/qAVw7o8rbFXZWj/2Fwi/oBVQ1BXwRqtabR0ivID4xehntF+plEoyxMcLGX4pq4ZWAF4JX4EwXezNSzh+Ad8SXyrCnQXC" +
            "L0M/R/gqAFeqp/7iGH4R+tmML4jwIfIXG/RS9LNBgqubKFxs0UvRz7oEg46mwUJHP+sVor1SyYpwtUUXrtIz189ZfBcAv7z45Eoe" +
            "vgDwImD5nJcv42s6gxdu0jMW3x/QbsnLB/hsYUU/Z/t5S8bXcAT7mCw26tnqZ8C3AOBFMPo528+7Kr5aLPr0BgeLrXqu+pnh6+Xi" +
            "26otFDR6tvFngW8OwtXWIpf0jPXzlseXXUVXK51FouH5xjd2PSPAJUl+Fy7wM10kwdcqwdX1RQjrua4gg68V4fXuQj8/4/iG5xUg" +
            "vL7Qz+j55gc3vCKAx/7Cfn6u+jmU5deEbxXwfR7+LyU0XoQuQjIG/ayb0YAx2Ff+PErpZ1PyhD72UFggzPQz4FvOBbgyDuehn5kK" +
            "aH4Lv9iitPktrPhz9pF/xtctfHp39z16QDPUSrs+glVna++nhdkA+B4o+HpPhO8v6Ov51Q6sVfhtWgN11bdmLB4hpC1deX1Cgj+9" +
            "/+uAr4/noJ/JL+SqbF2euiKEPpEZEP4MyTD50vf+7JYhk191dzV86Tx2KcBfrspLYtlR1q6lPYttx6oF5ctvoz93amSKDgzi8xT6" +
            "GX2PLorwhQvRJbkxg5L2UVsBuP7nPoQJl99cCWb6mczHVt8oF+FrUNWlWZSsj44WAMv62bSrin4mGM0V4PKsAN8tAH6w/Bq3NYtv" +
            "fW410I4Aa8fF7gynqAPAwZ8pvnFg2dYU3/YXQtGcAZ5NR4MEzxVg/OfTzzkAt+/mV5+TAXhpNhU9I8DeQkUL+/m8XABwpT1PQg5d" +
            "gpccJThzBmNMCLZf1HwAxviaXONnXloo6WcLwO74unxZE56oRIJzBVlGuMvfPYAUQkaS8S1tYhvAXg7AaSYCFtahlZ4eTCl+EfrZ" +
            "bEZDjAA7PvFuYX+yWs7Aa5Ng+WJKdYYr8Zv8B91MwkYjDCc3Ud4IzwiweuBgORIjGjZu/dpwOKz99BkLJjjyvO1n88HH8aVkjvgy" +
            "Ee6XExl2BLjUa6B/EHYdk8bu0Wgg/ncwGB3tNkImYthgZFkBhiul+yts7fPVQZlGZwrWpD883DxttTgpWKt1unk8ZDx/n/Fz188m" +
            "Hd1G7vYVdn2s+lflAhNaedZGDcTgpVtHA+UR9Lze0UoouPgcz+Bb9H/O1qUq77P4Vcx8heHJaTW7lmFdvj2soefGDUaK8OWmzROo" +
            "JoqmFxf9i/75+cHBwXn/YFW9itWtfr/faPThl1jse1BDRTd5DHu7IcoGunIBpuj2pKIQQ0VVSPAsh/tjwDSi9JNAvny7zWrGn8/6" +
            "zoBvWY8PPsVDq1RYbKgXsaGn/wBez7oA4r0wU4mQ5wc3ER1X1EL+ff4yBHMOWwxdDd8I429qz0iIKTsK/xh8wZCJcvrsY0h0gMnE" +
            "91Mr1w+lYk8zxPVuuvk5AEPGZL2itdJ1mJONUedUwGsEmEF8+f4JQyRBgKWl/HOGJfTzhcm8kfGF0ppHLqeTwiDBkmEcInLkGRJM" +
            "CsR7ia0UWgEmqLuu8/adwf/Dte5XqimHkBnh5befnySzHDRJk7n2QRADHUhIB/Ef9jEI0mch4IuFBfj/868WN8qclXzLdQ/sRsK+" +
            "k38fuPyYBRfA+yfg/4v3jN6ZL8JjD9l1Dd/jFxa86QCXN0Bz4IztFo48h1Vq30TfFVrShUGMb0nBFzJlGJ1JJFEWgJfva+h67taQ" +
            "sHOu74gffm2ScErupiH5/o589y3sKvx7+unL12n4idzBS+E0DD+F5A5U20349VN4E36iU0Km4R38N6V3N5+IDw/M9KPRkJXtq8/M" +
            "7qChX/sMZW+3oU98WDyIROFv/LlWA7hBhfo/UC6tt/x1tnx4CUf2N6YPkeBE/H3UH3jGYg8N4fqN2CoLwECby2k3tQOYMvPqTKEB" +
            "M8K7XF2+rM1ZS7Mw//T83Zs3O7lr1X1NIEB5UeB7QvYmDDFq99S1blwtbV2ydX//9v02yve0jBI85QBzy4dOInwdEG4jP7Am/PEU" +
            "7en4rvM+OpDfagG+AuDl5bX77blaWrA3v77bWbKtssOSNqHsDSYkRB8L8N1DX0KaKV2rmJdxI5K9YNuxfPnjh1zLxAhwpO3hZASD" +
            "ybNXbOluHU4aYBWA6eeEFkrGlz2BjDHZEeDltbfBHAPUBE3fLRUsoWydsGabdIRCTFbzn4VdHq1tl3K7/LP9pLbdYBuy9jZPqxkB" +
            "DuNzPIyKTZzwBVC7zF6qqQwyAHANZ2i/kgsfC/nF/nru3Sgy/H5+htZ/oF93lgoBnmUx8HyTiyTjG4LVUS85Apy3G3xH/vLBXi/P" +
            "AF5SAf4USbCP+155FoAhZo0NFBR1CGHUK8ltxDcy5n2SYCScVKW7qRTc0Da+npf8/nVpab4Al70tLceg7h87fw3ya5fgSu52MCH+" +
            "YJVhowR/wiL0SUhGQWeucDAaDfS4FkN1BWTVpKJpim9yIyfi7AAHWFNIFRGGPm2xE0e9pbW3c7KzOL6vYD0BwEYfqZzq528N+JYe" +
            "Ir5FCJvPYFs0hkemRYYhlINbXCkzEcaEkTAqAHd7+o2cBKJOBaOxckesyf14CIcz2h4eXy7r9/RhLkqaBL++4vgWIPwAgPu2I5vj" +
            "S0P0xYRvyRXfKvMnZIT/YrM98wC+hQiWpmN2JzxFy75EiV8ygEGEYcaTakX3ehXtVvaRoDTXBRjkd7Mm8sLMZDvWEF77Zi5RaXL9" +
            "LxG+r+aopMHLhNBQ3hEN0cOwXnoUwLoQr/1oeehtVjR/8cuqhu8WyC7FPNIC+eBdBWDmKuEUYK9kWSw8SbmZDl99omnoTcBVVI3Q" +
            "GkGHy5pRMQ+Sgyb666t0zQ/gj3Dt+MqO7xTiw/WSM8CVqrOSprO5SbCHfYN+CXF2YNeoFB+/cd6BguNTBHAlopERtty6RsN5Q1Oj" +
            "EG+jb5Z1HY0fH55EiQDPFeABAedjw6yj2f5NEWo74lutVNzkV6g1PCPANOsjCYBHgaTpadBIhTdKYXfh+woAZjQUUZgNHO2OdlvD" +
            "rNEPwbztS+XIsd3MbAL86ytHCZ7xEIbsOZ6sGlMNWwhSN6RechZgmwQbAP65ZjyFDW7SAXNm+UsfPYMBIQ/t4tU53MCK7KoVQyRL" +
            "a6NL3gY09L56S2MREEsLtNB79WbePt7KIug/l2SAX80F37I3ggojkx3N8A19Skbm3ZnFCTYBDDqaGOo+OMBLGsACvSv1CvvJ8Rwn" +
            "jrZKSf2Y+LhniEUrd8KIcnFUhOLrAB8LEwrHOpzioXoz94+WYEVDv7LjO6sAl2GXfKorRs87YHkNOH89z1mALVp62bAsnpJFgrlu" +
            "VE0Fb0CVJCRFjZLShtFGE9sZk9zJfmQFYxbXPFPvaShSyyJWytY//UvlXi5vH30Eo+m/KSraoqddYc2IMPGJhrA3aID8knBU8rxZ" +
            "JNgd4L8Z1ZpdgnGgRlRB+fhmgKUy37AQYJHiR4K5Uc4zcIBpks4Wn/j3yiF8iR/PODfdkQG2ncNu+PKm2zQcDWlGlC2G8ryjkOWP" +
            "mPzOcALPCDCeDWA00QFmSWmUirEEsJcBOFdFM7IRSnMATssV2E8jDGBFgucO8KvHaWiPx6kilHk82vfR5CBWgasbfTjPKBLy65Ue" +
            "ewY/FuAvRgmGEGWYiJUCcCkjwUVGFkP4JL4YA8AdJNejQExcMaPnoKKxoqIfB3CaLYzd3YAnmtGkD5WNBxPC4MWoMShJe+UAsDEy" +
            "b8Q37wxeUvPBEe+edgZPuJrPlgNslWQBZpXcDGDPy9HQsPZQXP6hnsHVQ+xLCGM0VANz9788nlWQSEbWq0cZWVl4BUEClBqDSxS7" +
            "eyw4hMLdQUnaqnka0SxYmQMwK4BfyqYLkclN8iI3Kd18IrDMXvUeN7I8LwfitNLOaEWfsFBQVHDAfhBzk6pqXO4f6NFtYbKb9Oox" +
            "fnBWfOOkwhHbqlvoAAl52IZuDUpWgqyZcsEWCf4RWwMdym0cRL4QvOQp58zolzCQqpm0IxgCHT/lA5xqYsqVfEd7ZodChJMyXNrS" +
            "Ax1z8IP/6qKhy+4SrOnro62JsCXDUOoZeKyJZZbg9ygXYC0fzA9Y7S6kSEcQRnGODL49mqjoAoDX/VuWkUS+FqrcRNs0q6GP1dzJ" +
            "8hxy/gFRDmGb9DojbOgMgbzq0dHRaDQo4rh7tI5e+9m3S7ByDyJUyVzFiX4XEIfzsegSg2Nly9AMSUODBFd6yW1Ed8IMLX6gS+l+" +
            "cUMw4PzvvJIsYLHMoZYc+0vt8SqaJRuWXjlB7FjK4V4Z8XiAtWTS2r8ie7pwSQU4xNgYq2QlZVtMr/o+ATs2NJAfQ6TS5CbVqaHi" +
            "7owdtsohLC7/mLUihSK4eqjd0NqP13PJBytm1mMBjqXYofLFmzPAazYFbQT4QJTsGBL+ohVta8K/c5JaDSnAvRAyfDrAkERE7Urm" +
            "PsTfkBNG15iu6/fTOhQGqD88NdzPh7lQZhP065LLKTwLwJ4TwHPX0Wv/nluyY5RgbsNOrrw4UpO5jcHRUdpFKl8xa7epaZGsOih9" +
            "GlftZIsqfZ7XOKsabgf6Rjc3Ty+jmh3ZSfo8n7rKZlyyMw+IJTf4AQBXKjPZWY7yawE4LnwnasKwLFVg6ZfcA/JgLEp2sndR506P" +
            "r7c1jGssNGYS4bgyxfTAzq2s8jt0/mppPio6jWIV6+cZ7ehKQWn02s//WlA2awUYEkrJKVxw+fEJzGs02gnAXlwXjXn1s3Yj3OeV" +
            "TuFCjTS3mjsuwxdvUiG2F0Wbw8+6Ff1A5axUmzq4SdGWrMH6+W8o74GPI1kZjDfiM5hZsZNVL2sl5l94m6cJdCu6zq+AJY4MnWfs" +
            "R51U3RXS5W9kfq0NTdQ834lSSSaAyx/70EptWhtSpiEJUTZYY3XSWa2srvgIf60YiyrX97vdTnYNh/AHfnWOjdtxef/j+w8OrSsK" +
            "kUO2Nwk6g718PtoMwj2o9lUkuJRKcIBrvDhaeULB0CLUX6+6ivDah7k2GALRMTl/92+20/ed/TsbmiyzfLnzahv53q3r2LAZ73mI" +
            "rICDOCrZySrpg2zzmdzbkKeDGJMHj0AJgJXWFRFcpj1dD0F51v+gznrVEeD3cx46E3wHBtv01/PzNyaALyBJwKYSEAwNplluIOgh" +
            "/OgpHjDvWFDWHc3+i/qCdb3po64O8Ara9qUVNWj7/n/hWkvfjQ+MHqWoU8tQk3WQqmhBJeLNhC+umZrPRF4XdSuqDFfHlH2Ln49w" +
            "Eup4/wRDhZpc518Y8F0lUW46oXdKVog3PFmEIc6HQ8d+bWoCuGv+ev6ZBrBro2UhwLChBwOvEGAIZcQ9ayY3KbpenxtaWnIBLGzk" +
            "j6sFhzDr8f/wNEOjcHNKpjtGCU57pRWAk0i9l6nJ8YsATrI0K7qGpohmvjSTL2Wlibo+u78mDwWYSI9biBqjJBVmbfAnyc2ZJDiu" +
            "9fGhCtpwDFO4Bf8sYnCwAAx/7refjsKhiQw6unyeKRPWADY0Nfg2XJPPxcaGJoBDZHoWRPHSsf7Au5WWGmuyPqn6hO4OciAGBBvi" +
            "OBBFcplGwpStL1JzPN6hADzmHB0JSUf1j6DogEsw9JGWX4vceBbg6JNQixHYAFafDaEW9/RiUzv1BkY6t5R0WuGcyoa+2vs6gadZ" +
            "/ilgaoa7A+HrGRz3OlBl3ZDk2jT1k53ZIOIdFcUZ/ixeIvundnifmGSHonOjFZ0DsKGs3SLBGsBUt6KBlJSQJBGu8Nv5LV2Ct9Et" +
            "eggLywbgq24l4xcMt0YG2YWM2FbAPbHk6oGHRLp6oLvOvN0dI+rQVHTcKRF0TqJbqUg3c/oentabpyRRAndJC18tla9wOjBGVdE5" +
            "ACOMckUYyqG06vcKKzjGWJbHWGSG+iN/785hunGVEkxciZI77Zu5t9XfTfPWrNS9NzqCkTvwWvYeeKJ4r56wTtTbIZIrMbsnWf6J" +
            "8X7CDy4Msf2TbIIBrEUgM2QP8VNzZNHUytp58+7d6/Pzi4tJYGMTJEaAqeFp0J4N9j60Z/CSQhTLe/oDMT+xj3WA3zrbmwH6Gvtp" +
            "02mAdGIeHLUxMORJv7G1y9fWViNkeSXfl8yQiND902QSijVRT4hrVqQBK+S/aYiyFgV/g7DTOTwW63A4FN78k/MKN9G7Mof2/IJ8" +
            "Ic6TNrJBAiPAGQZdHHsTxOglcTopGeDYkTnVAX7vbJAEJNMwT/28mXga8zxRuBZx1JGQpXDTNCuV3kXQAKW6CTiCVH742u9BKEzQ" +
            "+bvXF5NoSygLWYQpOVUU5WC8VfGXb2WrOEwSnIEqC3VUjWqIY1GkWVlCQ6tHMAN4lga8LO1XkULPxHMIMTL1m4wKmREXRwpDcH8l" +
            "uih9HdwmRgnFIp/096UvBCVG/pvIFHhBIBeiQYiJewv9jdGqVMmxmxNFxbJFp3tJPV+KbGS2zI+KHiR8L7dzMCLk+2Yz2uTm92kk" +
            "bS5pVsVuRIrBAEJPqXCpfIp0EzX9x6w/txabsJoKcI12hGQaYQjZhIONDV5PJRakwOFUYjzZoisgFCWxYX/3Ks0DH7mGyanBS6pn" +
            "v1kCuGY+grEbF6n8/ELAlRjwUmxqXMxcbZVf5UnOvJqIMH4IwJKUzeovB9dNwV1PgIV34+pqVSOWFAvsyl79aHerK44VcZ714yAB" +
            "a1lxI3omOsUOOIu++XvBYjccwbYwB+xDeBGtyYT/xbNfE/bPUJ8na9rr/N1XA7eJ9EanLAwm5atdb3eTDRH4ptp9ZnZojP5+vBkv" +
            "KOmahYa5Of1egLtxtVpI8RxVNtT3Vrik0All1UuCzMIMsOlODEb0ns0qth3Bt2aL+dPrHUvJL3OSrj4e9EnK32gHWHWULboaZxoF" +
            "I92kEwknNkj6bKQuguu5cLOZqb287Dg/HwFtcnBfX+0sOc3rTFtP6ntckm/Yh5A5kCMTwMbAFDW1XFr0+60SiBZHsOUZJvRduagk" +
            "ZfXjAUm1J9bQc6Wzld3A6M26smFRI1ifw4Fnm1IgHpzDZSkK4PZwYH4gXbx+s7pULpvrc/IKMyqlXnuvy/z+GgsEDUaOTPymXFKp" +
            "Y7tkFojWKNLv/46d43FLasbfg264iZTNsAGMi/GVvtJXrMdKN3qQ1NhN4UGg3dimdP+tzw4IczVFWCK4bH/eCwpvQA3VV+AemM01" +
            "aTjbWCYj2g7wqQ7wpvGrA2PKxKSxvdUN5vore25CzhFglA9wHOzABrF3O4IVgIt5eFht9fTiXVGFXXFlFVSHnnVZf4qz0iHaAF5w" +
            "g4lV5FmuXAX4EP3dGNLAO3k9VtL9XZGoTzgKriGMkSGGnrPnOsRhwiisAYxV1TAzwNlNKASYx5NevykuoXQpnWMJkxUQzG3sGlPR" +
            "KschpYbNVmxTdG8pAA/lExvHAKMdN3TZnV1NorC0ADhj4+LENsp5ZmWkLAB3EhWtAowz5vXMElxtFVQ7gAFMTCzCDwOYQwwxdVRz" +
            "0tHY5CW11SgYSgaqn2lEHcstc/wnIP/ccS/uBq4JQiSnGyM9doEtesWowsNcFW2w33IfoUdIML5457gPTgCLIgYgz3Vyz8Dv6RmY" +
            "aXzL5LdgrANsPoLzVLSFtA1nI5CKcGWvBT8W4Aye6c9w19GaBBep6L/uPAZgTy9p5jnuk47LNd+ZjOguwkbPiqDauq6hj81Oc8EZ" +
            "rDfD9qUnEueaUqo9ZgLYYGT5arjrAVEOA8CFxT3N8zdzE+FMt/ZZUJzF83UjWgZY/uJ9A5XS0CbBQa4EqzcIIkz00GiKX5BCqn/F" +
            "gwDWFNRTAQz3FVy8cTFGvFkQBh7GbmHmWqfj5RV35tuuGY5gq4LSjSzlaVX/vRrGlnTWY4J4NUQzoVQY85JhWwhTlsSA5Z4sAKdX" +
            "G4jRtUFgCkqwkSQYi8kjjgDzbBS+NZQfYhZ8Pt8xeYtLDpX+1r6iavWwQAEFjKVGsaIr4x8s34RrY0OYwxaI1gCGygWxPr67MgRi" +
            "y1p9R5CkgJKsLm5iRYcTni0iPI0ajaUNotRvngQHFBsTEdr4S33orAlgTKVs1W2gp1bQ9HWxlnaysiSGgibKjwB9MRnR2B6IruiZ" +
            "BuoEMBQNZta3EG03kR9n32DKBBhqOhgtwYBl0Tg7OPoiRRexeomUPRjdLmN3WJGZ37MAs79qPq35PkwluvtFqUGoDQ8hm3B6yrpK" +
            "D4divEs2urm5LLtJmOVLYUbte7Y+/GQ22eDp1fT0w8xomS53mIcw8O30NDfYlmqgxiP40Aqwcga/xmzu0xdwh76DKVAs9aXZ0b48" +
            "YwiI3pXau0EbMI6TEyIgRffq0WrvUVaw14UaLbiNkzyAwTvcH6elWqeg6YJo2rA/PD5VEiqnjBIeUyvAAK///u1l2qb1zQcTxBDb" +
            "m+rBrKVHSTAjrB/mmFpNZkR7hoIsF/+PL2tPgw4wiGSQLOb2bijBDnSHM/KPzJWVvb14wixs4S0Oe1ndE6JuvVSJk9oKwJ0EYHiu" +
            "TzLMQfCbcUqzGqHOZstIan9/uJ1Md1QBrmL8zaXcJL1sHjAEP+H1zBq6AGDGFIS27ZHortYjDABbPGiyrtWKL9/fYMcz+DVqpvgy" +
            "xhPcVwFOjjo2g3SUN5wyEeJ2KbsR3eyxW7MBTKF3RWOdZUUsw1M7qX3rMJ6frUnwh/tllbtlbe3HmiGCC9f9enZHqaB7mz2eOCfV" +
            "oFlpXbPSBbtU7/awhTmKAObdYX1NReO48ivYzR1OeZOQfNdLmSEOJSlo41sAxpnepITxDlyE2qZpnnAK8XEtjsUoEqwx88QDhnBh" +
            "jq04XFkyxbJ0GaZ5kWhlqgU1YxY3x6uZBt8Z4K8S97Y6ldwTrHeYHRxkVDAzaRLTAKcAa0sCuJIArMsvWCpQ21Y7rdoHZQltVYvK" +
            "FBWAbYSOJsbOQJFhA8ADTklSyo4fKZRhm6WFA53yvRcQC8vViT5R2VbNYbKi8ddmVN7ImleJSk/pRcyz8HEyKJ6KxZ5Z7A5wIsGU" +
            "jY1W2dB8sIOPc9EVCPuiNFMD2EIIZ+SzUBqTDAAfbfUbUPZf8kr2dIPCvNDybZNueoaKOxNbOws9jnUJtr6xDvA58JBIP1qxsVYn" +
            "AQeY4E+jwvGUpbpPGPtvULeTMvpaNslnB4POdnfKuhX/73q1UojwsQiwGABeNnN2GhgP4Pl+U2RojbbAzm1sHfX4dBmviF8Dfr5+" +
            "VIqzzlCv04YAtcHKJzHRo3Rbp1YTHdB6I/dWkQmI7oQvqBXduNLcYBp1nx25jB9lJEogT/WS1dqkBoCBrlJnM7wBg49QB4DFYUdd" +
            "JdhCKdVU+r+NZ/CA84uGW23TwBETe8qxab4T62rw9FwSNUX7E5Y49ZFGjmfwUjIcl/3Rq7MmImZI2YAkc/mZOpzST1V0yUmCwxt9" +
            "7gqjZuF9/ycOAMMDjZGzimZK2kRaMkWvy1aE0zvcbfD9aPecRlpBWp6YjWh1X/bNACf0NNoT7SbByr1o2aS+qNqBwlwxGjezRtCb" +
            "tHs00GZEswPRrqJ7poT/vrY1Z8J295WmOpiLfNrKjjNMqhssKto8nuRHk4YLvpM7/G2Df3u7IQtJ0L1iiFk4xtB0E+r1OqDZYpZ9" +
            "RdhjCjEl04BmAthKCnUQt3UyvhGpNfioEV3sVk+SYjac8h8AcMkSkD9LhkTHRhY24HvCgpvCNj5MRPj0+LDGGCxrw+OWnhydRYL/" +
            "8hs2xpfOnRylUm+FgYTCtoOOhkujev5Pp/Ls2cJYXZ24hGssK8DWdKHIomRvbTW2oGnQl7v7YX4IlJhBVieMpsSkFJt1yDCZreje" +
            "uD7eb8rJBmZF7xv082fKE/8s7xIF6o6H3AO75dq1prS7nzI7XAeYBSjv7y9NhrQ5/vAup7pF0lMNXmHXbReLcFWbVgX7ow9Oqlsc" +
            "Kh6IVhDOOYJZH6Fz0d1VGAexaEw3Et8hmw+T0DV8qkuUpPAaA1ghyurtUXodsOSmCrCO7z6K2415lAnaclpsViXersV9fuiHU7UI" +
            "3Df4wfcffmBl47W3upllBvjCMZbFKDmB8QihlV4RwBB08rWidz3V0EYYGVX0iYGZ5tDeARU0LQDHldFL2fL3viicBRdiJAHM5hfG" +
            "/YHkJmiUsjS5zJDWVHQ9mvRAqQrwSUVxMKpiamXsMQBbwPAQ4KV3vKtMUEf5+FC1o3WAIaUWZ6jfr6lz08wIN9+4ZpRKdTiJwQjM" +
            "Tnm20BCqFpGYY2LnuJDjlOsGbqmhvfAr5wwuR4SGS5ny94+E/VwgFZbwHfygvGs9HbwCd47ZbD7ZyALTK+r3q2n0HcrGtDoxWXV6" +
            "ZMGfbeX+ayrA21qo8i3ajko6ffR2TSZHt6VeL5wTDuwkZrSr6f3YeCY3lZ5qwueYKCp6xQJwR2d4XD6leSo6r/BdZbyDssoJY0aB" +
            "TufsXY5UJsajzARSFlQldXlYFvxXLRmioyT8ZYCr61x+5QoeyA+LzO7wMFnHarO7CvBya9tPqhSvP6hjHG1ZADcRjpiToY0PUtXd" +
            "XsWqoU1Zh1Cbjx5N9NTjHH6WaLk40+AGsDZHB47BIzsPcimaSyk+E67wXayivXiaYSxL8MivVHKOLZhaqTUV83TwGXOP7J7woQ7w" +
            "McqUVm9fqgNozIna4HxpBoS5mg4TNW3hAlYNacLnXGgAE+MDNzbQ/x3mpJohvb1jtp+N+Eal0cHIK+a5LkUjSBmnvyLBNMAWgNVd" +
            "2UfbSmFXjY0AbxXFOnSA2dGHU0m4X3MBGNIATiKcmI5dcZ7sVfII21s/yM2MWJ9Oac4lWY9gmifBeiQrZdhZNZZGU7LqQIUcxWcl" +
            "gIWx2CNpbS2V/GCN8w5oKnxJgiHLdFwcq+TpMwng5WqWVKsmH8J2gKndF86GebJnp88tx1yEh3LrvqFep/4l4lbAsobuGPBtbeew" +
            "B2sAv5OpUS/ONzSQYczKqhNRfYk7R3DPipFVzzAwyhKs78WY+hRnJ+d1Wi7BSh3g1m+ZNkVngMHg2HFQ0pJ1BPtdE4XsNoA3Zfal" +
            "RsngJREDd1VmMGvm1jbz6q4N2aT/UE3JDU2E4xmVxSJsBLidaTv6QTKyDJtxxs7rGBoWxXTJNgDAWAV4G6W1fM4ASxFpu47OgsPz" +
            "K6wIp2IdPihl95pmLynU6JPgHz+NDTTpx4IW0DXhT74y9uKEzhgi/+ijWhqdzKh0GUfADEI5ktWOssRCRedKsOj5T+n+OlUXfA1G" +
            "1nK28H0GgKndUzJLMCum8tkj1KlUrK5S1iyiZi+pZmCeCzomav8hukbuVjRwbWY5ghhDX6AWVvaxM8A86y+HKj0BMIpV9F4BwJXO" +
            "P2sxIyI9tXOTKgDT+QDM4pXlwliWNu2aXXDXgjBczZkEsCHV0EV6LT9mxLyGeUM+CvLIZAwAy3RZ0K+gFXWsFo+LiVloIGYVSvlg" +
            "BnDSZqwAHG1ISanUiUraaRyI5cSVldlVdIYN0BngJC/sDDCT4Vosw2aAT/20Hod1jjoBrAx1dMg02IruZDo0qN24UpP+VxLAI3XM" +
            "RJfNmeh2V7a6jW6TdTXICf92UoyHEdUBNvCD13BSEZwEDJi/AQXv8SoAuPpQgIGF6E2hCJdMCBvSnnENcKaTCJgiB3ouqabTvWF6" +
            "MzZMX8nLNJhVdDNza7y8kahjoTdSanMRqsxnNcmGKjMSHM1s0PzgkibDTOdFzAVqu0DqQbRmOINBQX7jDDB4SjPq6FgCcxDuZCht" +
            "aEk7g+tIyxqTUFbQCcKdXK61AoB555dKogoAH8g3CYR9jMYwYTQE/hFGFkV5Qxq8xXVdGkmaqmgeqqxoo2T0Y5ibZWioNgvghI25" +
            "ZnCTVKK/hwEM1/+mXJRPMhGoQLyMjQ0yQpwGs4goevcUL0n1fADwE+MApYK+Zx1gMoU2oIh5cjplNH39Va3/rD+Q77KRJdaAz6/3" +
            "Br12mGpiFWBsax+F/VjXM8LVdcqF/TASAHFvp2g7JgaleFhkRV/+lu2nnkFFwyWeGwEu5/U1jCeQqgYZHpsEOOsJU7yiTz7bk7uw" +
            "2fTmmhnffC/YAPC5+hUTfRBBH32nBKNZwh8eiGvOwQrh8xEzlntRbb4BYGLvD+YUq2cVw5gOzg6VUXOnMLImAnhb4W4UANv7g30V" +
            "4FruHn3aKZuMrFyE22Leo1YdGl07owRhTbeQWdrVAV7htLZ3hBGw3jD6XrKybpmAdohuZgL4zevX5/Cbr4ODjY+GDtJVqHxPB+tE" +
            "CEcDSPkzGVXtJDkvHOeDk4ENEsAayw6QBWtF0XAM+7xcJ5ZgbqnwsdG4to2GraJkQz7A2wXc/uWifKGJp47X/3bM4WiSivDIALD8" +
            "8/39sW3EXcsP8EwAF09fhO6kGxIO1HTDYJcRr4aNxm4vrfff4w2+OsDf2wCG4xYGTNFAf/CH6L8iFR3dGug5gIXcsodl2CoOdNQe" +
            "DDD4AfopXAgwHCs84HFmxAZOzsZWYwvWqKR/f2+lu7LC/8Bqj3WzM3YmijR0brqwbBnDCDQdOMoIK3c5GAxEeDJTF41FZ4YcycoD" +
            "mEm9r9uf635sZGU6Rg/Bf6K1w80ZI1mzAtwsFmHD3MEx85WIH47N+YZknmPehMrIZ7SFxCp5xRyO+WCDALN5GyIlXJxuoJyLp16S" +
            "h743jQBXEoBNxzDwgm2vawWjbFWXDez285TggIezZtTRkZImZiUN/Eq7JacRpNYIX5XbIRg9AmAjxH2WnCJ4MvBcQpVi7IAKMLED" +
            "HJUy0OZYTzvgzWrFLVT5fq4SzFizV4uoWAyodFg/ulFJg03BBwC4IWwfI9wpIhyfWYK9g7jivu+59K6EEKrBkR8cZ8WyAN+YJRiO" +
            "Pbqub0rHFeBZz+DfECpW0jMCzJQ0mCCk1tSVNBi/MsDerFOERaincHRFDpWhGeG49J3PGPHypwfzM5gHrVwluMIpHEyRV249d4x9" +
            "G2YJ1vLB/iMkOMo5zKaihZJGYgDnUwDMBPj2kQAr91Q+SLHx2RXmDaeEa27/wqdIOQIc9QdTpc0q41z4UVP47Cq6+kiAwS3dyUXY" +
            "CM2Yp0n4eEYd4IbrKHBrYvmsmLUzoPmtK7IUQ2E0zT7U/VG+hbUbk+zIRUc5fnAGYLYvVb2FRRBUVApVdE1j2XkUwCyrpDzvDugI" +
            "vkmKu6YzuOE97hCunmLqNqDvlRu8V32klgOSPA4HXigcN7B70mRKmsd0l1CAYKqQOFTXf0L+qVmGT/MjWYwQHD0oFp3ySZ6rkaxy" +
            "oQiv+yy5bsgTaADPjDCLcbgQnQaf3rgwVfK2BkK0CLiFhaXEm+58nKa0o4K7TIArClR3FbskzZReZ4dERzFpiMvxmkq18OywI7eu" +
            "qI2I8kwSjKTC6P/9dxdyxDs56+KViwFmIsyGIWC/yIo299ZaShHjA9h3o6JWWtk102r16uNGn6vzwMBHgxq7A+1RhF7SMBV3otAo" +
            "TbLTmLA0lGO9m30qeYlddp2xwDvUVSqBq9YmFF9uZhBjBR0Qus50i771FVLFv62l62ffaSTLVBsQ7DmIMNujG02EdYBzITbgu+86" +
            "oQQ2+wLCz3zFf8efQzz6os/lNrgz7wHhkwl2RxmQB0B2B5HpMMhWhgoitDasFXkyJchpdw/++4StsxApw47oPn9hc5P92b+OeP79" +
            "/c2YB60FWf8aU7o+473bfLv59u3xUMTP0PA4Xod3SBlCgD68/yZa0JKG0UPmsjroWEFYRzQRVgIdswLsLL9CwFDhJJKc2VmCl4pC" +
            "FJpFViEgzQU3JApBoPxIWYeQ4NwBJZlhf+inGq/k2L4VFIaGd6F5o2zyfmoO5+DBrACPQ/FQnhQCXPKcj+AqdGzVkPMKmrYFSeFm" +
            "8Xg73JSHo0EaDOvPSFKoifVYfjTZDjpKtff+nNZQp1SiMquo+OmsyEW8T/IixSKxjQ3cpa6jYlSv8mCmWAd3C25ZR7Xi88ElHpUM" +
            "deRmlDX7ueM6Mm9+KyB8NzPjk5968WqR6+D3vc0puriydxiazazbLPVCZGuAXI+MoQPLYyJ7izfu+nmx0KyD37/fKHtaSYddR6+H" +
            "kVMvZU6ABnRgif4ViHC1tY9+f/n9Ey04fvpXnucqwdGEOhbQkSI2iJr7BApJ886gPStYwPCUR4OPvm6s8jiHk5l1whhaZB0N/h7q" +
            "WgDOPYTXT3y0UM9Pr6YxlKrFE2QLAe6FzEzFqF7gBhec5XwQE0Xo95h9vlh8guzI6RCOZn3RIFtC2w3Q0WzglsZn3WtUON5jseal" +
            "p0HtBn0liGfgMwRwqjzWAfQaGU0Lnt2o5JgtrPR647MV5kGSkCx2/veDmIph34JWuFTSoBKlcuvjdke0/4W9RIShChjzuJC2VqKP" +
            "8CtaMNlCJH395kJ6f2+Dmp+HEz6SZKAKYm8ModcEHWZmjROA9xMSGsdnyV+cvH+UGIfNKM4DwdpuIxa6BsR8gripKA6cniRpIcaz" +
            "Q0ne8n32m/B5M2QB7h+5AujmMM3Z4mOaMhRQhDUqRWNJ8eIsfYbCzCa0RT14LIqqBiM+xwMoK5WzhSv7Ij2rbuo3LZTuC5RwFssS" +
            "GcRogPpivTCAwwjg/YWGfpEAB1/GlagrbZEMepHWdlCviCKehXp+oVZWu8JpKBd+7ctcPgd4IcAvHOBebYHvC11sek6p1Mk0Ry/W" +
            "iwOYESQt6m1eLsBQ3bFIC73YBbScpe7CwnrJRtbe3iKG9bI94doiTYheeE31QkP/Qev/AQXokbUmPk21AAAAAElFTkSuQmCC";

    public static Image Muat()
    {
        if (sudahDicoba) return gambar;
        sudahDicoba = true;
        try
        {
            using var ms = new MemoryStream(Convert.FromBase64String(Data));
            using var asli = Image.FromStream(ms);
            gambar = new Bitmap(asli);
        }
        catch { gambar = null; }
        return gambar;
    }
}